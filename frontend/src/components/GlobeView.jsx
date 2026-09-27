import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Layers,
  Thermometer,
  Waves,
  Grid,
  Box,
  MapPin,
  RotateCw,
  Compass,
  Plus,
  Minus,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Eye,
  Minimize2,
  X,
  Globe,
  Crosshair,
  Compass as CompassIcon,
  Navigation,
  Wind,
  Calendar,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { fetchPointData } from '../services/api';

export default function GlobeView({
  buoys = [],
  selectedBuoy = null,
  setSelectedBuoy = () => {},
  overviewData = {},
  onViewDetails = () => {},
  depth = 50,
  onDepthChange = () => {},
  onSelectPoint = () => {},
  selectedDate = "2026-08-30",
  onDateChange = () => {}
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const globeGroupRef = useRef(null);
  const cloudsMeshRef = useRef(null);
  const thermalMeshRef = useRef(null);
  const arrowMeshRef = useRef(null);
  const targetGroupRef = useRef(null);
  const primaryBuoyRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const arrowsRef = useRef(null);
  const requestRef = useRef(null);
  const depthRef = useRef(depth);
  const dateRef = useRef(selectedDate);

  // UI Control states
  const [layers, setLayers] = useState({
    sst: true,
    salinity: true,
    currents: true,
    ssh: false,
    waveHeight: false,
    dissolvedOxygen: false,
  });

  const [sources, setSources] = useState({
    roms: true,
    insitu: true,
  });

  const [activeVisTool, setActiveVisTool] = useState('temp');
  const [isBuoyCardOpen, setIsBuoyCardOpen] = useState(true);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false); // Collapsed by default so point card has plenty of room!
  const [isControlsOpen, setIsControlsOpen] = useState(true);

  // Point Selection state
  const [selectedPointData, setSelectedPointData] = useState(null);
  const [isPointLoading, setIsPointLoading] = useState(false);

  // Time scrubber autoplay
  const [isPlaying, setIsPlaying] = useState(false);

  const activeBuoy = selectedBuoy || (buoys.length > 0 ? buoys[0] : null);

  // Sync depth & date refs & refresh point data when depth or date changes
  useEffect(() => {
    depthRef.current = depth;
    dateRef.current = selectedDate;
    if (selectedPointData && selectedPointData.point) {
      fetchPointData(selectedPointData.point.latitude, selectedPointData.point.longitude, depth, selectedDate)
        .then(setSelectedPointData);
    }
  }, [depth, selectedDate]);

  // Autoplay date sequencer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const cur = new Date(selectedDate + "T12:00:00Z");
      cur.setDate(cur.getDate() + 1);
      if (cur > new Date("2026-09-06T12:00:00Z")) {
        onDateChange("2026-08-24");
      } else {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        onDateChange(`${yyyy}-${mm}-${dd}`);
      }
    }, 2200);
    return () => clearInterval(interval);
  }, [isPlaying, selectedDate, onDateChange]);

  // Interpolate primary buoy along drift track based on selectedDate
  useEffect(() => {
    if (primaryBuoyRef.current && primaryBuoyRef.current.trackCurve) {
      const { pinMesh, ringMesh, trackCurve } = primaryBuoyRef.current;
      const refDt = new Date("2026-08-30T12:00:00Z");
      const curDt = new Date(selectedDate + "T12:00:00Z");
      const dayOffset = Math.round((curDt - refDt) / (1000 * 60 * 60 * 24));
      const progress = Math.max(0.0, Math.min(1.0, (dayOffset + 5) / 10.0));
      const pos = trackCurve.getPointAt(progress);
      pos.multiplyScalar(1.005);
      pinMesh.position.copy(pos);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
    }
  }, [selectedDate]);

  const handlePrevDay = () => {
    const cur = new Date(selectedDate + "T12:00:00Z");
    cur.setDate(cur.getDate() - 1);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate + "T12:00:00Z");
    cur.setDate(cur.getDate() + 1);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  const formatDisplayDate = (dStr) => {
    try {
      const d = new Date(dStr + "T12:00:00Z");
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  // Update thermal overlay visibility and opacity when depth or layers.sst changes
  useEffect(() => {
    if (thermalMeshRef.current) {
      thermalMeshRef.current.visible = layers.sst;
      if (layers.sst) {
        if (depth <= 50) {
          thermalMeshRef.current.material.opacity = 0.85;
        } else if (depth <= 200) {
          thermalMeshRef.current.material.opacity = 0.55;
        } else if (depth <= 500) {
          thermalMeshRef.current.material.opacity = 0.30;
        } else {
          thermalMeshRef.current.material.opacity = 0.12;
        }
      }
    }
  }, [layers.sst, depth]);

  // Update currents visibility when layers.currents changes
  useEffect(() => {
    if (arrowMeshRef.current) {
      arrowMeshRef.current.visible = layers.currents;
    }
  }, [layers.currents]);

  // Setup Three.js with Exact World Map Texture and Raycaster Point Selection
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 3, 24);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Globe Pivot Group
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.28;
    globeGroup.rotation.y = -1.55; // Center on Indian Ocean & Bay of Bengal
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
    sunLight.position.set(20, 15, 25);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(-20, -10, -15);
    scene.add(rimLight);

    // 6. Texture Loader for Exact NASA World Map
    const textureLoader = new THREE.TextureLoader();
    const globeRadius = 8;

    const dayTexture = textureLoader.load('/earth_daymap.jpg', () => {
      renderer.render(scene, camera);
    });
    dayTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const specTexture = textureLoader.load('/earth_specular.jpg');

    // Earth Sphere Mesh
    const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      map: dayTexture,
      specularMap: specTexture,
      specular: new THREE.Color(0x7dd3fc),
      shininess: 25,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    // Cloud Layer Sphere
    const cloudTexture = textureLoader.load('/earth_clouds.png');
    const cloudGeo = new THREE.SphereGeometry(globeRadius * 1.006, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
    globeGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // Atmospheric Rim Glow Shader
    const atmoGeo = new THREE.SphereGeometry(globeRadius * 1.026, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
          gl_FragColor = vec4(0.8, 0.9, 1.0, 1.0) * intensity * 1.5;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmoMesh);

    // SST Thermal Colormap Canvas Overlay
    const sstCanvas = document.createElement('canvas');
    sstCanvas.width = 2048;
    sstCanvas.height = 1024;
    const sstCtx = sstCanvas.getContext('2d');

    const toX = (lon) => ((lon + 180) / 360) * sstCanvas.width;
    const toY = (lat) => ((90 - lat) / 180) * sstCanvas.height;

    const drawThermalGradient = (lon, lat, radiusX, radiusY) => {
      const cx = toX(lon);
      const cy = toY(lat);
      const grad = sstCtx.createRadialGradient(cx, cy, 8, cx, cy, radiusX);
      grad.addColorStop(0, 'rgba(235, 45, 30, 0.72)');
      grad.addColorStop(0.28, 'rgba(255, 140, 0, 0.65)');
      grad.addColorStop(0.55, 'rgba(245, 215, 30, 0.55)');
      grad.addColorStop(0.78, 'rgba(30, 200, 150, 0.38)');
      grad.addColorStop(0.92, 'rgba(0, 160, 240, 0.22)');
      grad.addColorStop(1, 'rgba(0, 60, 180, 0)');

      sstCtx.save();
      sstCtx.beginPath();
      sstCtx.scale(1, radiusY / radiusX);
      sstCtx.arc(cx, cy * (radiusX / radiusY), radiusX, 0, Math.PI * 2);
      sstCtx.fillStyle = grad;
      sstCtx.fill();
      sstCtx.restore();
    };

    drawThermalGradient(88, 14, 180, 150); // Bay of Bengal
    drawThermalGradient(92, 12, 130, 110); // Andaman Sea
    drawThermalGradient(68, 15, 140, 130); // Arabian Sea
    drawThermalGradient(78, 2, 210, 80);   // Equatorial IO

    const sstTexture = new THREE.CanvasTexture(sstCanvas);
    const sstGeo = new THREE.SphereGeometry(globeRadius * 1.003, 64, 64);
    const sstMat = new THREE.MeshBasicMaterial({
      map: sstTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const sstMesh = new THREE.Mesh(sstGeo, sstMat);
    globeGroup.add(sstMesh);
    thermalMeshRef.current = sstMesh;

    // Helper: lat/lon to 3D vector on sphere
    function latLonToVector3(lat, lon, radius) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    }

    // G. Ocean Currents Visualized as Small White Arrows Tangent to the Globe
    const arrowCount = 280;
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.16);
    arrowShape.lineTo(0.065, 0.0);
    arrowShape.lineTo(0.024, 0.0);
    arrowShape.lineTo(0.024, -0.12);
    arrowShape.lineTo(-0.024, -0.12);
    arrowShape.lineTo(-0.024, 0.0);
    arrowShape.lineTo(-0.065, 0.0);
    arrowShape.closePath();

    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const arrowMesh = new THREE.InstancedMesh(arrowGeo, arrowMat, arrowCount);
    arrowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    globeGroup.add(arrowMesh);
    arrowMeshRef.current = arrowMesh;

    function updateArrowMatrix(arrow, outMatrix) {
      const r = globeRadius * 1.013;
      const phi = (90 - arrow.lat) * (Math.PI / 180);
      const theta = (arrow.lon + 180) * (Math.PI / 180);
      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const z = (r * Math.sin(phi) * Math.sin(theta));
      const y = (r * Math.cos(phi));
      const pos = new THREE.Vector3(x, y, z);
      const normal = pos.clone().normalize();

      const upRef = new THREE.Vector3(0, 1, 0);
      let east = new THREE.Vector3().crossVectors(upRef, normal);
      if (east.lengthSq() < 0.0001) {
        east = new THREE.Vector3(1, 0, 0);
      } else {
        east.normalize();
      }
      const north = new THREE.Vector3().crossVectors(normal, east).normalize();

      const dir = new THREE.Vector3()
        .addScaledVector(east, arrow.u)
        .addScaledVector(north, arrow.v);
      if (dir.lengthSq() < 0.0001) {
        dir.copy(east);
      } else {
        dir.normalize();
      }

      const right = new THREE.Vector3().crossVectors(dir, normal).normalize();
      outMatrix.makeBasis(right, dir, normal);
      outMatrix.setPosition(pos);
    }

    const arrowData = [];
    const tempMatrix = new THREE.Matrix4();

    for (let i = 0; i < arrowCount; i++) {
      const lat = -16 + Math.random() * 38;
      const lon = 52 + Math.random() * 46;

      let u = 0.8;
      let v = 0.1;
      if (lat >= 6 && lon >= 80) {
        const angle = Math.atan2(lat - 14, lon - 88) + 1.25;
        u = Math.cos(angle);
        v = Math.sin(angle);
      } else if (lat >= 6 && lon < 78) {
        const angle = Math.atan2(lat - 14, lon - 66) + 1.15;
        u = Math.cos(angle);
        v = Math.sin(angle);
      } else if (lat < -5) {
        u = -0.95;
        v = 0.08;
      }

      const item = {
        lat,
        lon,
        u,
        v,
        speed: 0.035 + Math.random() * 0.045,
      };
      arrowData.push(item);
      updateArrowMatrix(item, tempMatrix);
      arrowMesh.setMatrixAt(i, tempMatrix);
    }
    arrowMesh.instanceMatrix.needsUpdate = true;
    arrowsRef.current = { arrowMesh, arrowData, count: arrowCount, tempMatrix, updateArrowMatrix };

    // H. Target Reticle Beacon for Selected Point
    const targetGroup = new THREE.Group();
    targetGroup.visible = false;
    globeGroup.add(targetGroup);
    targetGroupRef.current = targetGroup;

    // Center dot
    const targetDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    targetGroup.add(targetDot);

    // Inner ring
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.30, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    targetGroup.add(innerRing);

    // Outer pulsing ring
    const pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.40, 0.48, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    targetGroup.add(pulseRing);

    // Crosshairs
    const crossMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const crossHGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.6, 0, 0), new THREE.Vector3(0.6, 0, 0)]);
    const crossVGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0, 0.6, 0)]);
    targetGroup.add(new THREE.Line(crossHGeo, crossMat));
    targetGroup.add(new THREE.Line(crossVGeo, crossMat));

    // I. Buoy 3D Pins & Historical Drift Track Line
    const buoyGroup = new THREE.Group();
    globeGroup.add(buoyGroup);

    const trackPoints = [
      latLonToVector3(10.4, 86.1, globeRadius * 1.013),
      latLonToVector3(11.2, 87.0, globeRadius * 1.013),
      latLonToVector3(12.0, 87.8, globeRadius * 1.013),
      latLonToVector3(12.6, 88.2, globeRadius * 1.013),
      latLonToVector3(13.15, 88.67, globeRadius * 1.013),
    ];
    const trackCurve = new THREE.CatmullRomCurve3(trackPoints);
    const trackGeo = new THREE.TubeGeometry(trackCurve, 32, 0.038, 8, false);
    const trackMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    buoyGroup.add(trackMesh);

    // Primary Buoy INCOIS-BOB-023 Pin
    const primaryPos = latLonToVector3(13.15, 88.67, globeRadius * 1.018);
    const pinGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.copy(primaryPos);
    buoyGroup.add(pinMesh);

    const ringGeo = new THREE.RingGeometry(0.25, 0.35, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(primaryPos);
    ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
    buoyGroup.add(ringMesh);
    primaryBuoyRef.current = { pinMesh, ringMesh, trackCurve };

    // Other active buoys
    const otherBuoys = [
      { id: 'INCOIS-ARB-014', lat: 16.42, lon: 67.85, color: 0x10b981 },
      { id: 'INCOIS-EQ-008', lat: -0.5, lon: 78.3, color: 0xffffff },
      { id: 'INCOIS-BOB-019', lat: 18.2, lon: 89.4, color: 0x10b981 },
      { id: 'INCOIS-AND-005', lat: 11.2, lon: 93.8, color: 0x10b981 },
      { id: 'INCOIS-SIO-031', lat: -14.2, lon: 82.5, color: 0xffffff },
    ];

    otherBuoys.forEach((b) => {
      const pos = latLonToVector3(b.lat, b.lon, globeRadius * 1.018);
      const mGeo = new THREE.SphereGeometry(0.14, 16, 16);
      const mMat = new THREE.MeshBasicMaterial({ color: b.color });
      const mesh = new THREE.Mesh(mGeo, mMat);
      mesh.position.copy(pos);
      buoyGroup.add(mesh);
    });

    // 7. Mouse Orbit & Precise Raycast Point Selection
    let isDragging = false;
    let startMousePos = { x: 0, y: 0 };
    let prevMousePos = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();

    const onMouseDown = (e) => {
      isDragging = true;
      startMousePos = { x: e.clientX, y: e.clientY };
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      globeGroup.rotation.y += deltaX * 0.005;
      globeGroup.rotation.x = Math.max(-0.6, Math.min(0.8, globeGroup.rotation.x + deltaY * 0.005));

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e) => {
      isDragging = false;
      const distMoved = Math.hypot(e.clientX - startMousePos.x, e.clientY - startMousePos.y);

      // If clicked without dragging, inspect this exact geographic coordinate on the globe!
      if (distMoved < 6 && container) {
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(globeMesh);

        if (intersects.length > 0) {
          // Local intersection coordinate on the rotating globe
          const localPt = globeGroup.worldToLocal(intersects[0].point.clone());
          const r = globeRadius;
          const phi = Math.acos(Math.max(-1, Math.min(1, localPt.y / r)));
          const theta = Math.atan2(localPt.z, -localPt.x);
          const lat = 90 - (phi * 180 / Math.PI);
          let lon = (theta * 180 / Math.PI) - 180;
          if (lon < -180) lon += 360;
          if (lon > 180) lon -= 360;

          // Position target reticle
          const targetPos = localPt.clone().normalize().multiplyScalar(r * 1.018);
          targetGroup.position.copy(targetPos);
          targetGroup.lookAt(targetPos.clone().multiplyScalar(2));
          targetGroup.visible = true;

          setIsPointLoading(true);
          fetchPointData(lat, lon, depthRef.current, dateRef.current).then((data) => {
            setSelectedPointData(data);
            setIsPointLoading(false);
          });
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = Math.max(15, Math.min(34, camera.position.z + e.deltaY * 0.015));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 8. Animation Loop
    let pulseAngle = 0;
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      pulseAngle += 0.02;

      // Animate current flow small white arrows
      if (arrowsRef.current && arrowsRef.current.arrowMesh) {
        const { arrowMesh, arrowData, count, tempMatrix, updateArrowMatrix } = arrowsRef.current;

        for (let i = 0; i < count; i++) {
          const a = arrowData[i];
          a.lon += a.u * a.speed;
          a.lat += a.v * a.speed;

          if (a.lon > 98) { a.lon = 52; a.lat = -16 + Math.random() * 38; }
          if (a.lon < 50) { a.lon = 96; a.lat = -16 + Math.random() * 38; }
          if (a.lat > 23) { a.lat = -15; }
          if (a.lat < -18) { a.lat = 21; }

          if (a.lat >= 6 && a.lon >= 80) {
            const angle = Math.atan2(a.lat - 14, a.lon - 88) + 1.25;
            a.u = Math.cos(angle);
            a.v = Math.sin(angle);
          } else if (a.lat >= 6 && a.lon < 78) {
            const angle = Math.atan2(a.lat - 14, a.lon - 66) + 1.15;
            a.u = Math.cos(angle);
            a.v = Math.sin(angle);
          } else if (a.lat < -5) {
            a.u = -0.95;
            a.v = 0.08;
          } else {
            a.u = 1.0;
            a.v = 0.04;
          }

          updateArrowMatrix(a, tempMatrix);
          arrowMesh.setMatrixAt(i, tempMatrix);
        }
        arrowMesh.instanceMatrix.needsUpdate = true;
      }

      // Pulse reticle target ring
      if (targetGroup.visible) {
        const targetScale = 1 + Math.sin(pulseAngle * 4) * 0.2;
        pulseRing.scale.set(targetScale, targetScale, 1);
      }

      // Gentle cloud drift
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.00045;
      }

      // Gentle slow globe auto-drift
      if (!isDragging) {
        globeGroup.rotation.y += 0.0003;
      }

      const scale = 1 + Math.sin(pulseAngle * 3) * 0.18;
      ringMesh.scale.set(scale, scale, 1);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(requestRef.current);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.max(15, cameraRef.current.position.z - 2.5);
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.position.z = Math.min(34, cameraRef.current.position.z + 2.5);
    }
  };

  const handleResetOrbit = () => {
    if (globeGroupRef.current && cameraRef.current) {
      globeGroupRef.current.rotation.x = 0.28;
      globeGroupRef.current.rotation.y = -1.55;
      cameraRef.current.position.set(0, 3, 24);
    }
  };

  const handleClearPoint = () => {
    setSelectedPointData(null);
    if (targetGroupRef.current) {
      targetGroupRef.current.visible = false;
    }
  };

  const handleSnapToOcean = (oceanPoint) => {
    if (!oceanPoint) return;
    const { lat, lon } = oceanPoint;
    const r = 8;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(r * Math.sin(phi) * Math.cos(theta));
    const z = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);
    const localPos = new THREE.Vector3(x, y, z);

    if (targetGroupRef.current) {
      const markerPos = localPos.clone().normalize().multiplyScalar(r * 1.018);
      targetGroupRef.current.position.copy(markerPos);
      targetGroupRef.current.lookAt(markerPos.clone().multiplyScalar(2));
      targetGroupRef.current.visible = true;
    }

    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.x = THREE.MathUtils.degToRad(lat * 0.35);
      globeGroupRef.current.rotation.y = -THREE.MathUtils.degToRad(lon + 90);
    }

    setIsPointLoading(true);
    fetchPointData(lat, lon, depthRef.current, dateRef.current).then((data) => {
      setSelectedPointData(data);
      setIsPointLoading(false);
      if (data && data.is_available !== false) {
        onSelectPoint(data);
      }
    });
  };

  return (
    <div className="relative w-full h-[660px] rounded-3xl overflow-hidden bg-black border border-white/[0.14] shadow-[0_25px_60px_-15px_rgba(0,0,0,1)]">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" title="Click anywhere to inspect ocean point data" />

      {/* TOP INTERACTIVE CLICK HINT BADGE */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/90 z-20 pointer-events-auto text-xs border border-white/20 shadow-lg animate-in fade-in">
        <Crosshair className="w-3.5 h-3.5 text-white animate-spin" style={{ animationDuration: '6s' }} />
        <span className="text-[11px] font-bold text-white tracking-wide">
          Point Inspector Active
        </span>
        <span className="text-[10px] text-zinc-400 font-mono pl-2 border-l border-zinc-700">
          Date: <strong className="text-white">{formatDisplayDate(selectedDate)}</strong> • Depth: <strong className="text-white">{depth}m</strong>
        </span>
      </div>

      {/* LEFT FLOATING CONTROL PANEL: DATA LAYERS, DATA SOURCE, DEPTH, VISUALIZATION */}
      {isControlsOpen ? (
        <div className="absolute top-4 left-4 w-72 bg-black/90 backdrop-blur-2xl rounded-2xl p-4 text-xs select-none pointer-events-auto shadow-2xl z-20 space-y-3.5 transition-all border border-white/[0.14]">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
            <span className="text-[10.5px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-white" />
              <span className="text-white">DATA LAYERS</span>
            </span>
            <button
              onClick={() => setIsControlsOpen(false)}
              className="text-zinc-500 hover:text-white p-0.5"
              title="Minimize Controls"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Layer toggles */}
          <div className="space-y-1.5">
            {[
              { id: 'sst', label: 'Sea Surface Temperature', icon: Thermometer },
              { id: 'salinity', label: 'Salinity', icon: Waves },
              { id: 'currents', label: 'Ocean Currents (White Arrows)', icon: Wind },
              { id: 'ssh', label: 'Sea Surface Height', badge: 'PF' },
              { id: 'waveHeight', label: 'Wave Height', badge: 'PF' },
              { id: 'dissolvedOxygen', label: 'Dissolved Oxygen', badge: 'PF' },
            ].map((layer) => {
              const isOn = layers[layer.id];
              return (
                <div key={layer.id} className="flex items-center justify-between py-0.5 group">
                  <div className="flex items-center gap-2 text-zinc-300 group-hover:text-white transition-colors">
                    {layer.icon ? (
                      <layer.icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                    ) : (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-700">
                        {layer.badge}
                      </span>
                    )}
                    <span className="text-[11px] font-medium">{layer.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLayers((prev) => ({ ...prev, [layer.id]: !prev[layer.id] }))}
                    className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      isOn ? 'bg-white shadow-sm shadow-white/30' : 'bg-zinc-800 border border-zinc-700'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
                        isOn ? 'translate-x-3.5 bg-black' : 'translate-x-0 bg-zinc-400'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* DATA SOURCE */}
          <div className="pt-2 border-t border-zinc-800">
            <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1.5">
              DATA SOURCE
            </span>
            <div className="space-y-1">
              <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sources.roms}
                    onChange={(e) => setSources((prev) => ({ ...prev, roms: e.target.checked }))}
                    className="rounded border-zinc-700 bg-black text-white focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-zinc-200 font-medium">Model Data (ROMS)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-white shadow-sm shadow-white/50" />
              </label>

              <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sources.insitu}
                    onChange={(e) => setSources((prev) => ({ ...prev, insitu: e.target.checked }))}
                    className="rounded border-zinc-700 bg-black text-white focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-zinc-200 font-medium">In-situ Observations</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
              </label>
            </div>
          </div>

          {/* DYNAMIC DEPTH LEVEL SLIDER */}
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                DEPTH LEVEL (DYNAMIC)
              </span>
              <span className="font-mono text-white font-bold text-xs bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                {depth} m
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={depth}
              onChange={(e) => onDepthChange(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <div className="flex justify-between text-[9.5px] text-zinc-400 font-mono mt-1.5">
              <button onClick={() => onDepthChange(0)} className="hover:text-white transition-colors">0m</button>
              <button onClick={() => onDepthChange(100)} className="hover:text-white transition-colors">100m</button>
              <button onClick={() => onDepthChange(250)} className="hover:text-white transition-colors">250m</button>
              <button onClick={() => onDepthChange(500)} className="hover:text-white transition-colors">500m</button>
              <button onClick={() => onDepthChange(1000)} className="hover:text-white transition-colors">1000m</button>
            </div>
          </div>

          {/* VISUALIZATION */}
          <div className="pt-2 border-t border-zinc-800">
            <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block mb-1.5">
              VISUALIZATION
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'temp', icon: Thermometer, tip: 'Temperature' },
                { id: 'waves', icon: Waves, tip: 'Currents' },
                { id: 'grid', icon: Grid, tip: 'Grid Vectors' },
                { id: 'volume', icon: Box, tip: '3D Volume' },
                { id: 'pins', icon: MapPin, tip: 'In-situ Markers' },
              ].map((tool) => {
                const isActive = activeVisTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveVisTool(tool.id)}
                    title={tool.tip}
                    className={`flex-1 p-1.5 rounded-lg flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-white text-black font-bold shadow-md shadow-white/20'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    <tool.icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsControlsOpen(true)}
          className="absolute top-4 left-4 bg-black/90 p-2.5 rounded-xl text-white hover:bg-zinc-900 z-20 pointer-events-auto shadow-xl flex items-center gap-2 text-xs font-semibold border border-white/20"
        >
          <Layers className="w-4 h-4 text-white" />
          <span>Data Layers ({depth}m)</span>
        </button>
      )}

      {/* FLOATING POINT TELEMETRY INSPECTOR POPUP (WHEN USER CLICKS ON GLOBE) */}
      {(selectedPointData || isPointLoading) && (
        <div className="absolute top-4 right-16 w-84 bg-black/95 backdrop-blur-2xl rounded-2xl p-4 text-xs select-none pointer-events-auto shadow-2xl z-30 space-y-3 border border-white/30 animate-in fade-in zoom-in-95">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <div>
                <span className="font-extrabold text-white text-[12px] tracking-wide block uppercase">
                  OCEAN POINT TELEMETRY
                </span>
                <span className="text-[9.5px] text-zinc-400 font-mono">
                  {selectedPointData ? `${selectedPointData.point.lat_str}, ${selectedPointData.point.lon_str}` : 'Querying grid...'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedPointData && (
                <span className={`px-2 py-0.5 rounded-full font-mono font-extrabold text-[9.5px] ${
                  selectedPointData.is_available === false ? 'bg-amber-400 text-black' : 'bg-white text-black'
                }`}>
                  {selectedPointData.point.region}
                </span>
              )}
              <button
                onClick={handleClearPoint}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                title="Dismiss Point"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isPointLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Crosshair className="w-6 h-6 text-white animate-spin" />
              <span className="text-[11px] font-mono">Extracting 4D NetCDF telemetry...</span>
            </div>
          ) : selectedPointData && selectedPointData.is_available === false ? (
            <div className="space-y-3">
              {/* DATA UNAVAILABLE ON LAND / OUTSIDE DOMAIN ALERT */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {selectedPointData.status === 'land' ? 'Data Unavailable on Landmass' : 'Outside Operational Domain'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {selectedPointData.message}
                </p>
              </div>

              {/* RECOMMENDED OCEAN POINT & LOCK ACTION */}
              {selectedPointData.nearest_ocean_point && (
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">Nearest Monitored Ocean:</span>
                    <span className="font-mono text-white font-bold">
                      {selectedPointData.nearest_ocean_point.region}
                    </span>
                  </div>
                  <div className="font-mono text-[10.5px] text-zinc-400 flex items-center gap-1.5">
                    <CompassIcon className="w-3 h-3 text-white inline" />
                    <span>Coordinates: {selectedPointData.nearest_ocean_point.lat_str}, {selectedPointData.nearest_ocean_point.lon_str}</span>
                  </div>
                  <button
                    onClick={() => handleSnapToOcean(selectedPointData.nearest_ocean_point)}
                    className="w-full py-2.5 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-md shadow-white/20 mt-1 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-black" />
                    <span>Lock to Ocean ({selectedPointData.nearest_ocean_point.region})</span>
                  </button>
                </div>
              )}
            </div>
          ) : selectedPointData && selectedPointData.telemetry ? (
            <div className="space-y-3">
              {/* Telemetry 2x3 Grid */}
              <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                {/* Water Temp */}
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 text-[9px] block">Water Temp (Depth {depth}m)</span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="font-mono text-white font-extrabold text-sm">
                      {selectedPointData.telemetry.temperature_observed} °C
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      Model: {selectedPointData.telemetry.temperature_model}°C
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    Difference: <strong className="text-white">+{selectedPointData.telemetry.temperature_diff} °C</strong>
                  </span>
                </div>

                {/* Salinity */}
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 text-[9px] block">Salinity</span>
                  <span className="font-mono text-white font-extrabold text-sm block mt-0.5">
                    {selectedPointData.telemetry.salinity} PSU
                  </span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    {selectedPointData.point.region.includes('Bengal') ? 'Freshwater plume' : 'High evaporation'}
                  </span>
                </div>

                {/* Current Velocity */}
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 text-[9px] block">Current Velocity</span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="font-mono text-white font-extrabold text-sm">
                      {selectedPointData.telemetry.current_speed} m/s
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {selectedPointData.telemetry.current_bearing}°
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-400 block mt-0.5 flex items-center gap-1">
                    <Navigation className="w-2.5 h-2.5 text-white inline" />
                    Vector heading
                  </span>
                </div>

                {/* Seafloor Bathymetry */}
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 text-[9px] block">Seafloor Bathymetry</span>
                  <span className="font-mono text-white font-extrabold text-sm block mt-0.5">
                    {selectedPointData.telemetry.bathymetry_depth.toLocaleString()} m
                  </span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    Abyssal basin floor
                  </span>
                </div>

                {/* SSH Anomaly */}
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 text-[9px] block">Sea Surface Height</span>
                  <span className="font-mono text-white font-extrabold text-sm block mt-0.5">
                    +{selectedPointData.telemetry.ssh_anomaly} m
                  </span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    Altimetry SLA
                  </span>
                </div>

                {/* Dissolved Oxygen */}
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 text-[9px] block">Dissolved Oxygen</span>
                  <span className="font-mono text-white font-extrabold text-sm block mt-0.5">
                    {selectedPointData.telemetry.dissolved_oxygen} mg/L
                  </span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    Pelagic oxygen zone
                  </span>
                </div>
              </div>

              {/* Nearest Profiler Bar */}
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[10px]">
                <div>
                  <span className="text-zinc-400 block text-[9px]">Nearest In-Situ Sensor</span>
                  <span className="font-mono font-bold text-white">
                    {selectedPointData.nearest_sensor.id} ({selectedPointData.nearest_sensor.name})
                  </span>
                </div>
                <span className="px-2 py-1 rounded bg-zinc-900 text-white font-mono font-semibold border border-zinc-700">
                  {selectedPointData.nearest_sensor.distance_km} km away
                </span>
              </div>

              {/* Action Button: Set Point as Global Focus */}
              <button
                onClick={() => onSelectPoint(selectedPointData)}
                className="w-full py-2 rounded-xl bg-white text-black font-extrabold text-[11px] hover:bg-zinc-200 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-white/20"
              >
                <span>Sync Dashboard to This Point</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* DOCKED BUOY CARD (LOWER LEFT) */}
      {isBuoyCardOpen && activeBuoy ? (
        <div className="absolute bottom-5 left-4 w-72 bg-black/90 backdrop-blur-2xl rounded-2xl p-3.5 text-xs select-none pointer-events-auto shadow-2xl z-20 space-y-2 border border-white/20 animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white font-mono text-[11.5px]">
                Buoy ID: {activeBuoy.id || 'INCOIS-BOB-023'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.2 rounded bg-white/10 text-white font-semibold text-[9.5px] border border-white/20">
                Live
              </span>
              <button
                onClick={() => setIsBuoyCardOpen(false)}
                className="text-zinc-400 hover:text-white p-0.5 ml-1"
                title="Hide Buoy Card"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-y-1 text-[10.5px]">
            <span className="text-zinc-400">Location</span>
            <span className="font-mono text-zinc-200 text-right">{activeBuoy.location || '13.15° N, 88.67° E'}</span>

            <span className="text-zinc-400">Region</span>
            <span className="text-zinc-200 text-right">{activeBuoy.region || 'Bay of Bengal'}</span>

            <span className="text-zinc-400">Depth Layer</span>
            <span className="font-mono text-white font-bold text-right">{depth} m</span>

            <span className="text-zinc-400">Temperature</span>
            <span className="font-mono text-white font-bold text-right">
              {depth <= 50 ? '29.2 °C' : depth <= 100 ? '26.5 °C' : depth <= 250 ? '16.8 °C' : depth <= 500 ? '11.9 °C' : '6.5 °C'}
            </span>

            <span className="text-zinc-400">Salinity</span>
            <span className="font-mono text-zinc-200 text-right">
              {depth <= 50 ? '34.7 PSU' : depth <= 200 ? '35.0 PSU' : '34.7 PSU'}
            </span>

            <span className="text-zinc-400">Time</span>
            <span className="font-mono text-zinc-400 text-right text-[9.5px]">
              {activeBuoy.time || '30 Aug 2026, 11:30 UTC'}
            </span>
          </div>

          <button
            onClick={() => onViewDetails(activeBuoy)}
            className="w-full py-1.5 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>View Full Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsBuoyCardOpen(true)}
          className="absolute bottom-5 left-4 bg-black/90 px-3 py-1.5 rounded-xl text-white hover:bg-zinc-900 z-20 pointer-events-auto shadow-xl flex items-center gap-2 text-xs font-semibold border border-white/20"
        >
          <MapPin className="w-3.5 h-3.5 text-white" />
          <span>Show Buoy INCOIS-BOB-023 ({depth}m)</span>
        </button>
      )}

      {/* FLOATING INTERACTIVE DATE & TIMELINE SCRUBBER BAR */}
      <div className="absolute bottom-22 left-1/2 -translate-x-1/2 bg-black/95 backdrop-blur-2xl rounded-2xl px-4 py-2 z-20 shadow-2xl pointer-events-auto border border-white/20 flex items-center gap-2.5 select-none animate-in fade-in">
        {/* Play / Pause Auto-Drift Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isPlaying ? 'bg-white text-black font-bold shadow-md shadow-white/30' : 'bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-700'
          }`}
          title={isPlaying ? 'Pause Date Playback' : 'Play Date Sequence'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Step Backward Day */}
        <button
          onClick={handlePrevDay}
          className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
          title="Previous Day (-1d)"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Active Date Display & Native Picker */}
        <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white/40 transition-colors cursor-pointer group">
          <Calendar className="w-3.5 h-3.5 text-white shrink-0" />
          <span className="font-mono text-white font-extrabold text-xs tracking-wide">
            {formatDisplayDate(selectedDate)}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [color-scheme:dark]"
            title="Click to select any date"
          />
        </div>

        {/* Step Forward Day */}
        <button
          onClick={handleNextDay}
          className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
          title="Next Day (+1d)"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Quick Date Presets */}
        <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-zinc-800">
          {[
            { date: '2026-08-25', label: '25 Aug' },
            { date: '2026-08-28', label: '28 Aug' },
            { date: '2026-08-30', label: '30 Aug (Live)' },
            { date: '2026-09-02', label: '+3d Forecast' },
          ].map((preset) => {
            const isSelected = selectedDate === preset.date;
            return (
              <button
                key={preset.date}
                onClick={() => onDateChange(preset.date)}
                className={`px-2 py-1 text-[10px] font-mono rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black font-extrabold shadow-sm'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTTOM CENTER COLORBAR LEGEND */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-2xl rounded-2xl px-5 py-2 z-20 shadow-xl pointer-events-auto border border-white/20">
        <p className="text-[10px] font-semibold text-white text-center mb-1">
          Sea Surface Temperature (°C) • Layer: {depth}m • Date: {formatDisplayDate(selectedDate)}
        </p>
        <div className="w-60 h-2.5 rounded-full bg-gradient-to-r from-[#003cb4] via-[#00c8a0] via-[#ffd200] to-[#e61e1e] shadow-inner" />
        <div className="flex justify-between text-[9.5px] text-zinc-400 font-mono mt-0.5">
          <span>18</span>
          <span>22</span>
          <span>26</span>
          <span>30</span>
          <span>34</span>
        </div>
      </div>

      {/* RIGHT FLOATING GLOBE CONTROLS */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2 z-20">
        <button
          onClick={handleResetOrbit}
          title="Reset Orbit View"
          className="p-2.5 rounded-xl bg-black/90 text-white hover:bg-zinc-900 border border-white/20 transition-all shadow-lg"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetOrbit}
          title="Align North"
          className="p-2.5 rounded-xl bg-black/90 text-white hover:bg-zinc-900 border border-white/20 transition-all shadow-lg"
        >
          <Compass className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2.5 rounded-xl bg-black/90 text-white hover:bg-zinc-900 border border-white/20 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2.5 rounded-xl bg-black/90 text-white hover:bg-zinc-900 border border-white/20 transition-all shadow-lg"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setLayers((prev) => ({ ...prev, sst: !prev.sst }))}
          title="Toggle SST Thermal Layer"
          className={`p-2.5 rounded-xl bg-black/90 border transition-all shadow-lg ${
            layers.sst ? 'text-white border-white' : 'text-zinc-500 border-zinc-800'
          }`}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* RIGHT FLOATING OVERVIEW PANEL */}
      {isOverviewOpen && (
        <div className="absolute top-4 right-16 w-80 bg-black/90 backdrop-blur-2xl rounded-2xl p-4 text-xs select-none pointer-events-auto shadow-2xl z-20 space-y-3 transition-all border border-white/[0.14]">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white tracking-wide text-[11.5px] uppercase">
                  OVERVIEW METRICS
                </h3>
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-white text-black font-bold">
                  {depth}m
                </span>
              </div>
              <p className="text-[9.5px] text-zinc-400 mt-0.5">
                Dynamic Depth Slice • Updated live
              </p>
            </div>
            <button
              onClick={() => setIsOverviewOpen(false)}
              className="text-zinc-500 hover:text-white p-0.5"
              title="Minimize Overview"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 Dynamic KPI Cards Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[8.5px] text-zinc-400 block leading-tight">Accuracy</span>
              <span className="text-white font-extrabold text-sm block mt-1 font-mono">
                {overviewData.kpi?.accuracy_overall || 87}%
              </span>
            </div>

            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[8.5px] text-zinc-400 block leading-tight">RMSE (T)</span>
              <span className="text-white font-bold text-sm block mt-1 font-mono">
                {overviewData.kpi?.rmse_temp || 1.35}°C
              </span>
            </div>

            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[8.5px] text-zinc-400 block leading-tight">Points</span>
              <span className="text-white font-bold text-sm block mt-1 font-mono">
                {overviewData.kpi?.data_points?.toLocaleString() || '1,248'}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[8.5px] text-zinc-400 block leading-tight">Buoys</span>
              <span className="text-white font-bold text-sm block mt-1 font-mono">
                {overviewData.kpi?.active_buoys || 36}
              </span>
            </div>
          </div>

          {/* ACCURACY BY REGION */}
          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex justify-between">
              <span>ACCURACY BY REGION</span>
              <span className="text-white font-mono">{depth}m</span>
            </h4>
            <div className="space-y-1.5">
              {(overviewData.accuracy_by_region || [
                { region: 'Arabian Sea', accuracy: 89 },
                { region: 'Bay of Bengal', accuracy: 84 },
                { region: 'Indian Ocean (South)', accuracy: 86 },
                { region: 'Western Pacific', accuracy: 90 },
                { region: 'Global Ocean', accuracy: 87 },
              ]).map((reg) => (
                <div key={reg.region} className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px]">
                    <span className="text-zinc-300">{reg.region}</span>
                    <span className="font-mono text-white font-semibold">{reg.accuracy}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${reg.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC ALERTS */}
          <div className="pt-2 border-t border-zinc-800">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              LAYER ALERTS ({depth}m)
            </h4>
            <div className="space-y-1.5">
              {overviewData.alerts && overviewData.alerts.length > 0 ? (
                overviewData.alerts.slice(0, 2).map((alert) => (
                  <div key={alert.id} className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white text-[10.5px]">{alert.title}</span>
                        <span className="text-[8.5px] text-zinc-500">{alert.time}</span>
                      </div>
                      <p className="text-[9.5px] text-zinc-400 mt-0.5 leading-tight">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400">
                  Optimal model coherence at {depth}m
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview toggle button when collapsed */}
      {!isOverviewOpen && !selectedPointData && (
        <button
          onClick={() => setIsOverviewOpen(true)}
          className="absolute top-4 right-16 bg-black/90 p-2.5 rounded-xl text-white hover:bg-zinc-900 z-20 pointer-events-auto shadow-xl flex items-center gap-2 text-xs font-semibold border border-white/20"
        >
          <Grid className="w-4 h-4 text-white" />
          <span>Overview ({depth}m)</span>
        </button>
      )}
    </div>
  );
}
