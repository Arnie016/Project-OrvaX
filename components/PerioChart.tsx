
import React, { useRef, useEffect, memo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { ToothData, MeasurementType } from '../types.ts';
import { TOOTH_POSITIONS, getToothType } from '../constants.ts';

// --- GLSL Shaders ---

const toothVertexShader = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vec4 worldPositionVec4 = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPositionVec4.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const toothFragmentShader = `
  uniform float riskScore;
  uniform bool isSelected;
  uniform bool isDimmed;
  uniform bool showPlaque;
  uniform float activeSurfaceHighlight; // 0.0: none, 1.0: buccal, -1.0: lingual

  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  // 2D Noise function
  float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec3 baseColor = vec3(0.98, 0.95, 0.88);
    vec3 riskColor = vec3(1.0, 0.2, 0.2);
    
    float riskFactor = smoothstep(0.0, 1.0, riskScore);
    vec3 finalColor = mix(baseColor, riskColor, riskFactor);

    if (showPlaque && riskScore > 0.1) {
       float plaqueNoise = noise(vUv * 20.0) * noise(vUv * 5.0);
       float plaqueFactor = pow(plaqueNoise, 2.0) * riskFactor * 0.8;
       finalColor = mix(finalColor, vec3(0.9, 0.9, 0.3), plaqueFactor);
    }
    
    vec3 light = normalize(vec3(0.5, 0.5, 1.0));
    float diffuse = max(dot(vNormal, light), 0.3) * 0.7 + 0.4;
    gl_FragColor = vec4(finalColor * diffuse, 1.0);

    if (isSelected) {
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.6, 0.8, 1.0), 0.5);
      gl_FragColor.rgb += vec3(0.1, 0.15, 0.2); // Add a subtle blue glow

      if (activeSurfaceHighlight != 0.0) {
        // Vector pointing inward toward the center of the arch
        vec3 inwardDir = normalize(vec3(-vWorldPosition.x, 0.0, 2.5 - vWorldPosition.z));
        float alignment = dot(vWorldNormal, inwardDir);

        float highlightFactor = 0.0;
        if (activeSurfaceHighlight > 0.0) { // Highlight Buccal (outward)
          highlightFactor = smoothstep(0.3, 0.7, -alignment);
        } else { // Highlight Lingual (inward)
          highlightFactor = smoothstep(0.3, 0.7, alignment);
        }
        
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 1.0, 0.0), highlightFactor * 0.7);
      }
    }
    
    if (isDimmed) {
      gl_FragColor.a = 0.95;
      gl_FragColor.rgb *= 0.95;
    }
  }
`;

const gumVertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const gumFragmentShader = `
    uniform float time;
    uniform vec3 selectedToothPosition;
    uniform float pocketDepths[6];
    uniform bool bopStates[6];
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    const vec3 HEALTHY_GUM_COLOR = vec3(0.86, 0.55, 0.58);
    const vec3 INFLAMED_RED = vec3(0.9, 0.2, 0.2);
    const vec3 GLOW_COLOR = vec3(1.0, 0.1, 0.1);

    void main() {
        float totalSeverity = 0.0;
        bool isBleeding = false;
        for (int i = 0; i < 6; i++) {
            totalSeverity += smoothstep(3.0, 8.0, pocketDepths[i]);
            if (bopStates[i]) {
                isBleeding = true;
            }
        }
        totalSeverity = clamp(totalSeverity / 3.0, 0.0, 1.0);

        vec3 finalColor = mix(HEALTHY_GUM_COLOR, INFLAMED_RED, totalSeverity);
        
        float dist = distance(vWorldPosition, selectedToothPosition);
        float glowIntensity = 1.0 - smoothstep(0.5, 2.0, dist);
        glowIntensity *= totalSeverity;
        finalColor += GLOW_COLOR * glowIntensity;

        if (isBleeding) {
            float pulse = (sin(time * 5.0) * 0.5 + 0.5);
            float pulseIntensity = pow(pulse, 2.0) * (1.0 - smoothstep(0.5, 1.5, dist));
            finalColor += GLOW_COLOR * pulseIntensity * 1.5 * totalSeverity;
        }

        vec3 light = normalize(vec3(0.8, 1.0, 0.5));
        float diffuse = max(dot(vNormal, light), 0.3) * 0.6 + 0.4;

        gl_FragColor = vec4(finalColor * diffuse, 1.0);
    }
`;

// --- Procedural Tooth Geometry Functions ---
// --- Enhanced Procedural Tooth Geometry Functions ---
const createIncisorGeometry = () => {
    const geometry = new THREE.CylinderGeometry(0.15, 0.2, 0.9, 8, 1);
    const position = geometry.attributes.position;
    
    // Create more realistic incisor shape
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const y = position.getY(i);
        
        if (y > 0.3) { // Crown area
            // Flatten the front and back (labial/lingual)
            if (Math.abs(z) > 0.1) {
                position.setZ(i, z * 0.6);
            }
            // Create slight taper toward incisal edge
            const taper = (y - 0.3) / 0.6;
            position.setX(i, x * (1 - taper * 0.2));
            position.setZ(i, position.getZ(i) * (1 - taper * 0.3));
        }
        
        if (y < -0.2) { // Root area
            // Taper the root
            const rootTaper = Math.abs(y + 0.2) / 0.3;
            position.setX(i, x * (1 - rootTaper * 0.4));
            position.setZ(i, z * (1 - rootTaper * 0.4));
        }
    }
    
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
};

const createCanineGeometry = () => {
    const geometry = new THREE.CylinderGeometry(0.18, 0.22, 1.1, 12, 1);
    const position = geometry.attributes.position;
    
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const y = position.getY(i);
        
        if (y > 0.4) { // Crown area
            // Create pointed cusp
            const cuspHeight = (y - 0.4) / 0.6;
            const cuspPoint = Math.pow(cuspHeight, 0.8);
            
            // Sharpen the tip
            if (cuspHeight > 0.7) {
                const sharpness = (cuspHeight - 0.7) / 0.3;
                position.setX(i, x * (1 - sharpness * 0.6));
                position.setZ(i, z * (1 - sharpness * 0.6));
            }
            
            // Create slight labial/lingual curvature
            if (Math.abs(z) > 0.1) {
                position.setZ(i, z * 0.7);
            }
        }
        
        if (y < -0.2) { // Root area
            // Longer, more tapered root
            const rootTaper = Math.abs(y + 0.2) / 0.4;
            position.setX(i, x * (1 - rootTaper * 0.5));
            position.setZ(i, z * (1 - rootTaper * 0.5));
        }
    }
    
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
};

const createPremolarGeometry = () => {
    const geometry = new THREE.CylinderGeometry(0.28, 0.3, 0.9, 16, 1);
    const position = geometry.attributes.position;
    
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const y = position.getY(i);
        
        if (y > 0.35) { // Crown area
            // Create two distinct cusps (buccal and lingual)
            const angle = Math.atan2(z, x);
            const cuspHeight = (y - 0.35) / 0.5;
            
            // Buccal cusp (larger)
            if (Math.abs(angle) < Math.PI / 2) {
                const buccalPull = Math.sin(cuspHeight * Math.PI) * 0.08;
                position.setY(i, y + buccalPull);
            }
            // Lingual cusp (smaller)
            else {
                const lingualPull = Math.sin(cuspHeight * Math.PI) * 0.05;
                position.setY(i, y + lingualPull);
            }
            
            // Create occlusal surface grooves
            if (cuspHeight > 0.3) {
                const grooveDepth = Math.sin(angle * 4) * 0.02 * cuspHeight;
                position.setY(i, position.getY(i) - Math.abs(grooveDepth));
            }
        }
        
        if (y < -0.15) { // Root area
            // Single root with slight taper
            const rootTaper = Math.abs(y + 0.15) / 0.3;
            position.setX(i, x * (1 - rootTaper * 0.3));
            position.setZ(i, z * (1 - rootTaper * 0.3));
        }
    }
    
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
};

const createMolarGeometry = () => {
    const geometry = new THREE.CylinderGeometry(0.35, 0.38, 0.85, 20, 1);
    const position = geometry.attributes.position;
    
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i);
        const y = position.getY(i);
        
        if (y > 0.3) { // Crown area
            const angle = Math.atan2(z, x);
            const cuspHeight = (y - 0.3) / 0.55;
            
            // Create 4 main cusps
            const cuspAngle = Math.floor((angle + Math.PI) / (Math.PI / 2)) * (Math.PI / 2);
            const angleDiff = Math.abs(angle - cuspAngle);
            
            if (angleDiff < Math.PI / 4) {
                // Main cusp elevation
                const cuspPull = Math.sin(cuspHeight * Math.PI) * 0.1;
                position.setY(i, y + cuspPull);
                
                // Create cusp ridges
                if (cuspHeight > 0.2) {
                    const ridgeHeight = Math.cos(angleDiff * 4) * 0.03 * cuspHeight;
                    position.setY(i, position.getY(i) + ridgeHeight);
                }
            }
            
            // Create central fossa (depression)
            if (cuspHeight > 0.4) {
                const fossaDepth = Math.sin(cuspHeight * Math.PI * 2) * 0.04;
                position.setY(i, position.getY(i) - Math.abs(fossaDepth));
            }
            
            // Add occlusal grooves
            if (cuspHeight > 0.3) {
                const groovePattern = Math.sin(angle * 6) * Math.cos(angle * 4);
                const grooveDepth = groovePattern * 0.015 * cuspHeight;
                position.setY(i, position.getY(i) - Math.abs(grooveDepth));
            }
        }
        
        if (y < -0.1) { // Root area
            // Multiple roots (simplified as tapered base)
            const rootTaper = Math.abs(y + 0.1) / 0.25;
            
            // Mesial and distal root separation
            if (Math.abs(x) > 0.1) {
                position.setX(i, x * (1 - rootTaper * 0.2));
            }
            position.setZ(i, z * (1 - rootTaper * 0.4));
        }
    }
    
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
};

// --- Component ---
interface DentalChart3DProps {
  chartData: ToothData[];
  selectedToothData: ToothData | null;
  onToothSelect: (id: number) => void;
  showPlaque: boolean;
  setCameraControls: (controls: OrbitControls) => void;
  activeSurface: 'buccal' | 'lingual' | null;
}

const DentalChart3D: React.FC<DentalChart3DProps> = ({ chartData, selectedToothData, onToothSelect, showPlaque, setCameraControls, activeSurface }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const toothMeshesRef = useRef<{ [id: number]: THREE.Mesh }>({});
  const gumMeshesRef = useRef<THREE.Mesh[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 0 });
  const [shouldMoveCamera, setShouldMoveCamera] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#10141C');
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 100);
    camera.position.set(0, 5, 16);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 4;
    controls.maxDistance = 30;
    controls.target.set(0, 0, 2);
    setCameraControls(controls);
    controlsRef.current = controls;

    chartData.forEach(toothData => {
      if (toothData.isMissing) return;
      const toothType = getToothType(toothData.id);
      const position = TOOTH_POSITIONS[toothData.id];
      const risk = (toothData.riskScore || 0) / 50;

      const material = new THREE.ShaderMaterial({
        vertexShader: toothVertexShader,
        fragmentShader: toothFragmentShader,
        uniforms: {
          riskScore: { value: risk },
          isSelected: { value: false },
          isDimmed: { value: false },
          showPlaque: { value: showPlaque },
          activeSurfaceHighlight: { value: 0.0 },
        },
        transparent: true
      });

      let geometry: THREE.BufferGeometry;
      switch(toothType) {
        case 'molar': geometry = createMolarGeometry(); break;
        case 'premolar': geometry = createPremolarGeometry(); break;
        case 'canine': geometry = createCanineGeometry(); break;
        default: geometry = createIncisorGeometry();
      }
      
      const toothMesh = new THREE.Mesh(geometry, material);
      toothMesh.position.set(position.x, position.y, position.z);
      
      // Flip upper arch teeth upside down (teeth 1-16)
      if (toothData.id <= 16) {
        toothMesh.rotation.y = position.rotationY;
        toothMesh.rotation.x = Math.PI; // 180 degrees rotation around X-axis
      } else {
        toothMesh.rotation.y = position.rotationY;
      }
      
      toothMesh.userData = { id: toothData.id, type: 'tooth' };
      scene.add(toothMesh);
      toothMeshesRef.current[toothData.id] = toothMesh;
    });

    const createGumArchFromTeeth = (
        allToothData: ToothData[], 
        orderedArchIds: number[],
        tubeRadius: number, 
        yPos: number
    ) => {
        const presentToothIds = orderedArchIds.filter(id => {
            const tooth = allToothData.find(t => t.id === id);
            return tooth && !tooth.isMissing;
        });
    
        if (presentToothIds.length < 2) return null;
    
        const toothPoints = presentToothIds
            .map(id => TOOTH_POSITIONS[id])
            .map(p => new THREE.Vector3(p.x, -0.5, p.z));
        
        // Add extra points at the ends to extend the arch
        const firstPoint = toothPoints[0];
        const lastPoint = toothPoints[toothPoints.length - 1];
        
        // Calculate direction vectors for extension
        const firstDir = toothPoints[1].clone().sub(firstPoint).normalize();
        const lastDir = lastPoint.clone().sub(toothPoints[toothPoints.length - 2]).normalize();
        
        // Add extended points
        const extendedPoints = [
            firstPoint.clone().add(firstDir.clone().multiplyScalar(1.5)), // Extend backward
            ...toothPoints,
            lastPoint.clone().add(lastDir.clone().multiplyScalar(1.5))    // Extend forward
        ];
    
        const curve = new THREE.CatmullRomCurve3(extendedPoints, false, 'catmullrom', 0.5);
    
        const gumGeometry = new THREE.TubeGeometry(curve, 128, tubeRadius, 8, false);
        const gumMaterial = new THREE.ShaderMaterial({
            vertexShader: gumVertexShader,
            fragmentShader: gumFragmentShader,
            uniforms: {
                time: { value: 0 },
                selectedToothPosition: { value: new THREE.Vector3() },
                pocketDepths: { value: [0, 0, 0, 0, 0, 0] },
                bopStates: { value: [false, false, false, false, false, false] }
            }
        });

        const gumMesh = new THREE.Mesh(gumGeometry, gumMaterial);
        gumMesh.position.y = yPos;
        gumMeshesRef.current.push(gumMesh);
        return gumMesh;
    };

    const upperArchIdOrder = Array.from({length: 16}, (_, i) => 16 - i);
    const lowerArchIdOrder = Array.from({length: 16}, (_, i) => 17 + i);
    
    const upperGum = createGumArchFromTeeth(chartData, upperArchIdOrder, 0.4, 2.5);
    if(upperGum) scene.add(upperGum);

    const lowerGum = createGumArchFromTeeth(chartData, lowerArchIdOrder, 0.3, -1.8);
    if(lowerGum) scene.add(lowerGum);


    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      
      // Update camera position display
      setCameraPosition({
        x: Math.round(camera.position.x * 100) / 100,
        y: Math.round(camera.position.y * 100) / 100,
        z: Math.round(camera.position.z * 100) / 100
      });
      
      gumMeshesRef.current.forEach(gum => {
        (gum.material as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime();
      });
      renderer.render(scene, camera);
    };
    animate();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let clickTimeout: NodeJS.Timeout | null = null;
    let clickCount = 0;
    
    const handleClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        for (const intersect of intersects) {
            if (intersect.object.userData.type === 'tooth') {
                clickCount++;
                
                if (clickCount === 1) {
                    // First click - wait to see if there's a second click
                    clickTimeout = setTimeout(() => {
                        // Single click
                        setShouldMoveCamera(false);
                        onToothSelect(intersect.object.userData.id);
                        clickCount = 0;
                    }, 300); // 300ms delay to detect double click
                } else if (clickCount === 2) {
                    // Double click detected
                    if (clickTimeout) {
                        clearTimeout(clickTimeout);
                        clickTimeout = null;
                    }
                    setShouldMoveCamera(true);
                    onToothSelect(intersect.object.userData.id);
                    clickCount = 0;
                }
                return;
            }
        }
    };
    
    currentMount.addEventListener('click', handleClick);

    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      currentMount.removeEventListener('click', handleClick);
      currentMount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const selectedId = selectedToothData?.id;
    const controls = controlsRef.current;
    const camera = cameraRef.current;

    Object.entries(toothMeshesRef.current).forEach(([id, mesh]) => {
        const material = mesh.material as THREE.ShaderMaterial;
        const isCurrentlySelected = Number(id) === selectedId;
        material.uniforms.isSelected.value = isCurrentlySelected;
        material.uniforms.isDimmed.value = selectedId != null && !isCurrentlySelected;

        if (isCurrentlySelected) {
            const highlightValue = activeSurface === 'buccal' ? 1.0 : activeSurface === 'lingual' ? -1.0 : 0.0;
            material.uniforms.activeSurfaceHighlight.value = highlightValue;
        } else {
            material.uniforms.activeSurfaceHighlight.value = 0.0;
        }
    });

    if (selectedId && toothMeshesRef.current[selectedId] && controls && camera && shouldMoveCamera) {
      const targetTooth = toothMeshesRef.current[selectedId];
      const targetPosition = new THREE.Vector3();
      targetTooth.getWorldPosition(targetPosition);

      gsap.to(controls.target, { 
        x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, 
        duration: 0.8, ease: 'power2.inOut' 
      });
      gsap.to(camera.position, {
        x: targetPosition.x, y: targetPosition.y + 1.5, z: targetPosition.z + 4,
        duration: 0.8, ease: 'power2.inOut'
      });
      
      const pd = selectedToothData.measurements[MeasurementType.POCKET_DEPTH] || {};
      const bop = selectedToothData.measurements[MeasurementType.BLEEDING] || {};
      const pds = [pd.disto_buccal, pd.mid_buccal, pd.mesio_buccal, pd.disto_lingual, pd.mid_lingual, pd.mesio_lingual].map(v => typeof v === 'number' ? v : 0);
      const bops = [bop.disto_buccal, bop.mid_buccal, bop.mesio_buccal, bop.disto_lingual, bop.mid_lingual, bop.mesio_lingual].map(v => !!v);
      
      gumMeshesRef.current.forEach(gum => {
        const material = gum.material as THREE.ShaderMaterial;
        material.uniforms.selectedToothPosition.value = targetPosition;
        material.uniforms.pocketDepths.value = pds;
        material.uniforms.bopStates.value = bops;
      });

    } else {
        gumMeshesRef.current.forEach(gum => {
            const material = gum.material as THREE.ShaderMaterial;
            material.uniforms.pocketDepths.value = [0,0,0,0,0,0];
            material.uniforms.bopStates.value = [false, false, false, false, false, false];
        });
    }
  }, [selectedToothData, activeSurface, shouldMoveCamera]);
  
  useEffect(() => {
    chartData.forEach(toothData => {
        const mesh = toothMeshesRef.current[toothData.id];
        if (mesh) {
            const material = mesh.material as THREE.ShaderMaterial;
            if(material.uniforms) {
              material.uniforms.riskScore.value = (toothData.riskScore || 0) / 50;
              material.uniforms.showPlaque.value = showPlaque;
            }
        }
    });
  }, [chartData, showPlaque]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg font-mono text-sm">
        <div className="text-xs text-gray-300 mb-1">Camera Position:</div>
        <div>X: {cameraPosition.x}</div>
        <div>Y: {cameraPosition.y}</div>
        <div>Z: {cameraPosition.z}</div>
      </div>
    </div>
  );
};

export default memo(DentalChart3D);
