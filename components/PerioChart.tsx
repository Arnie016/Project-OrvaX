
import React, { useRef, useEffect, memo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { ToothData, MeasurementType } from '../types.ts';
import { TOOTH_POSITIONS, getToothType } from '../constants.ts';
import { ToothTransformControls } from './ToothTransformControls.tsx';
import { ToothModelGuide } from './ToothModelGuide.tsx';
import { 
  getToothModelConfig, 
  ToothTransform, 
  getDefaultTransform,
  loadToothTransforms,
  loadToothTransformsFromFile,
  saveToothTransforms
} from '../toothModelMapping.ts';

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
  uniform bool isHovered;
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

    if (isHovered && !isSelected) {
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.7, 0.85, 1.0), 0.3);
      gl_FragColor.rgb += vec3(0.05, 0.08, 0.1); // Add a subtle highlight
    }

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
  const toothMeshesRef = useRef<{ [id: number]: THREE.Group }>({});
  const gumMeshesRef = useRef<THREE.Mesh[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 0 });
  const [shouldMoveCamera, setShouldMoveCamera] = useState(false);
  const [showTransformControls, setShowTransformControls] = useState(false);
  const [controlsToothId, setControlsToothId] = useState<number | null>(null);
  const [toothTransforms, setToothTransforms] = useState<{ [toothId: number]: ToothTransform }>({});
  const gltfLoaderRef = useRef<GLTFLoader>(new GLTFLoader());
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [hoveredTooth, setHoveredTooth] = useState<{ id: number; x: number; y: number } | null>(null);
  const cameraAnimationTriggeredRef = useRef<boolean>(false);

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

    // Function to load a tooth model from GLB
    const loadToothModel = (toothData: ToothData, transforms: { [toothId: number]: ToothTransform }) => {
      if (toothData.isMissing) return;
      
      const modelConfig = getToothModelConfig(toothData.id);
      if (!modelConfig) {
        console.warn(`No model config found for tooth ${toothData.id}`);
        return;
      }

      const position = TOOTH_POSITIONS[toothData.id];
      const risk = (toothData.riskScore || 0) / 50;
      const toothTransform = transforms[toothData.id] || getDefaultTransform();

      // Create a wrapper group for the tooth
      const toothGroup = new THREE.Group();
      toothGroup.userData = { id: toothData.id, type: 'tooth' };
      
      // Load the GLB model
      gltfLoaderRef.current.load(
        modelConfig.modelFile,
        (gltf) => {
          const model = gltf.scene;
          
          // Apply shader material to all meshes in the model
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const material = new THREE.ShaderMaterial({
                vertexShader: toothVertexShader,
                fragmentShader: toothFragmentShader,
                uniforms: {
                  riskScore: { value: risk },
                  isSelected: { value: false },
                  isHovered: { value: false },
                  isDimmed: { value: false },
                  showPlaque: { value: showPlaque },
                  activeSurfaceHighlight: { value: 0.0 },
                },
                transparent: true
              });
              child.material = material;
              child.userData = { id: toothData.id, type: 'tooth' };
            }
          });

          // Apply mirroring if needed (for right-side teeth)
          if (modelConfig.shouldMirror) {
            model.scale.x *= -1;
          }

          // Apply custom transformations
          model.position.set(
            toothTransform.position.x,
            toothTransform.position.y,
            toothTransform.position.z
          );
          model.rotation.set(
            toothTransform.rotation.x,
            toothTransform.rotation.y,
            toothTransform.rotation.z
          );
          model.scale.set(
            model.scale.x * toothTransform.scale.x,
            model.scale.y * toothTransform.scale.y,
            model.scale.z * toothTransform.scale.z
          );

          toothGroup.add(model);
        },
        undefined,
        (error) => {
          console.error(`Error loading model for tooth ${toothData.id}:`, error);
          // Fallback to procedural geometry if GLB fails to load
          const toothType = getToothType(toothData.id);
          let geometry: THREE.BufferGeometry;
          switch(toothType) {
            case 'molar': geometry = createMolarGeometry(); break;
            case 'premolar': geometry = createPremolarGeometry(); break;
            case 'canine': geometry = createCanineGeometry(); break;
            default: geometry = createIncisorGeometry();
          }
          
          const material = new THREE.ShaderMaterial({
            vertexShader: toothVertexShader,
            fragmentShader: toothFragmentShader,
            uniforms: {
              riskScore: { value: risk },
              isSelected: { value: false },
              isHovered: { value: false },
              isDimmed: { value: false },
              showPlaque: { value: showPlaque },
              activeSurfaceHighlight: { value: 0.0 },
            },
            transparent: true
          });
          
          const fallbackMesh = new THREE.Mesh(geometry, material);
          fallbackMesh.userData = { id: toothData.id, type: 'tooth' };
          
          // Apply mirroring for right-side teeth
          if (modelConfig.shouldMirror) {
            fallbackMesh.scale.x *= -1;
          }
          
          toothGroup.add(fallbackMesh);
        }
      );

      // Position the group in the arch
      toothGroup.position.set(position.x, position.y, position.z);
      
      // Flip upper arch teeth upside down (teeth 1-16)
      if (toothData.id <= 16) {
        toothGroup.rotation.y = position.rotationY;
        toothGroup.rotation.x = Math.PI; // 180 degrees rotation around X-axis
      } else {
        toothGroup.rotation.y = position.rotationY;
      }

      scene.add(toothGroup);
      toothMeshesRef.current[toothData.id] = toothGroup;
    };

    // Load transforms and then load all teeth
    const initializeTeeth = async () => {
      // Try to load from teethv2.json first
      let transforms = await loadToothTransformsFromFile('teethv2.json');
      
      if (Object.keys(transforms).length > 0) {
        console.log('✅ Loaded transforms from teethv2.json:', Object.keys(transforms).length, 'teeth');
      } else {
        // Fallback to localStorage
        transforms = loadToothTransforms();
        console.log('⚠️ Using localStorage transforms:', Object.keys(transforms).length, 'teeth');
      }
      
      setToothTransforms(transforms);
      
      // Load all teeth with the transforms
      chartData.forEach((toothData) => loadToothModel(toothData, transforms));
    };
    
    initializeTeeth();

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
            firstPoint.clone().add(firstDir.clone().multiplyScalar(1)), // Extend backward (shorter)
            ...toothPoints,
            lastPoint.clone().add(lastDir.clone().multiplyScalar(1))    // Extend forward (shorter)
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
        gumMesh.scale.y = 2.5; // Scale the gum vertically to make it taller
        gumMeshesRef.current.push(gumMesh);
        return gumMesh;
    };

    const upperArchIdOrder = Array.from({length: 16}, (_, i) => 16 - i);
    const lowerArchIdOrder = Array.from({length: 16}, (_, i) => 17 + i);
    
    const upperGum = createGumArchFromTeeth(chartData, upperArchIdOrder, 0.6, 4.1);
    if(upperGum) scene.add(upperGum);

    const lowerGum = createGumArchFromTeeth(chartData, lowerArchIdOrder, 0.5, -2);
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
    
    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      for (const intersect of intersects) {
        if (intersect.object.userData.type === 'tooth' || intersect.object.userData.id) {
          const toothId = intersect.object.userData.id;
          setHoveredTooth({ 
            id: toothId, 
            x: event.clientX, 
            y: event.clientY 
          });
          return;
        }
      }
      setHoveredTooth(null);
    };
    
    const handleClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        for (const intersect of intersects) {
            if (intersect.object.userData.type === 'tooth' || intersect.object.userData.id) {
                const toothId = intersect.object.userData.id;
                clickCount++;
                
                if (clickCount === 1) {
                    // First click - wait to see if there's a second click
                    clickTimeout = setTimeout(() => {
                        // Single click - select without camera movement
                        setShouldMoveCamera(false);
                        onToothSelect(toothId);
                        clickCount = 0;
                    }, 300); // 300ms delay to detect double click
                } else if (clickCount >= 2) {
                    // Double click - select with camera movement
                    if (clickTimeout) {
                        clearTimeout(clickTimeout);
                        clickTimeout = null;
                    }
                    setShouldMoveCamera(true);
                    onToothSelect(toothId);
                    clickCount = 0; // Reset immediately to prevent multiple triggers
                }
                return;
            }
        }
        // Reset click count if clicking outside a tooth
        clickCount = 0;
        if (clickTimeout) {
            clearTimeout(clickTimeout);
            clickTimeout = null;
        }
    };
    
    currentMount.addEventListener('click', handleClick);
    currentMount.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      currentMount.removeEventListener('click', handleClick);
      currentMount.removeEventListener('mousemove', handleMouseMove);
      currentMount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const selectedId = selectedToothData?.id;
    const controls = controlsRef.current;
    const camera = cameraRef.current;

    // Reset camera animation flag when a new tooth is selected or when shouldMoveCamera changes to false
    if (!shouldMoveCamera) {
      cameraAnimationTriggeredRef.current = false;
    }

    Object.keys(toothMeshesRef.current).forEach((id) => {
        const group = toothMeshesRef.current[Number(id)];
        const isCurrentlySelected = Number(id) === selectedId;
        const isCurrentlyHovered = hoveredTooth?.id === Number(id);
        
        // Update materials for all meshes in the group
        if (group) {
          group.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
              child.material.uniforms.isSelected.value = isCurrentlySelected;
              child.material.uniforms.isHovered.value = isCurrentlyHovered;
              child.material.uniforms.isDimmed.value = selectedId != null && !isCurrentlySelected;

              if (isCurrentlySelected) {
                  const highlightValue = activeSurface === 'buccal' ? 1.0 : activeSurface === 'lingual' ? -1.0 : 0.0;
                  child.material.uniforms.activeSurfaceHighlight.value = highlightValue;
              } else {
                  child.material.uniforms.activeSurfaceHighlight.value = 0.0;
              }
            }
          });
        }
    });

    if (selectedId && toothMeshesRef.current[selectedId] && controls && camera && shouldMoveCamera && !cameraAnimationTriggeredRef.current) {
      const targetToothGroup = toothMeshesRef.current[selectedId];
      const targetPosition = new THREE.Vector3();
      targetToothGroup.getWorldPosition(targetPosition);

      // Mark animation as triggered to prevent repeated animations
      cameraAnimationTriggeredRef.current = true;

      gsap.to(controls.target, { 
        x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, 
        duration: 0.8, ease: 'power2.inOut' 
      });
      gsap.to(camera.position, {
        x: targetPosition.x, y: targetPosition.y + 1.5, z: targetPosition.z + 4,
        duration: 0.8, ease: 'power2.inOut',
        onComplete: () => {
          // Reset shouldMoveCamera after animation completes
          setShouldMoveCamera(false);
        }
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
  }, [selectedToothData, activeSurface, shouldMoveCamera, hoveredTooth]);
  
  useEffect(() => {
    chartData.forEach(toothData => {
        const group = toothMeshesRef.current[toothData.id];
        if (group) {
            group.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                if(child.material.uniforms) {
                  child.material.uniforms.riskScore.value = (toothData.riskScore || 0) / 50;
                  child.material.uniforms.showPlaque.value = showPlaque;
                }
              }
            });
        }
    });
  }, [chartData, showPlaque]);

  // Handle transform changes from the control panel
  const handleTransformChange = (toothId: number, transform: ToothTransform) => {
    const group = toothMeshesRef.current[toothId];
    if (group) {
      // Find the model within the group (first child)
      const model = group.children[0];
      if (model) {
        model.position.set(transform.position.x, transform.position.y, transform.position.z);
        model.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
        
        // Get the model config to check if mirroring is applied
        const modelConfig = getToothModelConfig(toothId);
        const mirrorMultiplier = modelConfig?.shouldMirror ? -1 : 1;
        
        model.scale.set(
          transform.scale.x * mirrorMultiplier,
          transform.scale.y,
          transform.scale.z
        );
      }
    }
    
    setToothTransforms(prev => {
      const updated = {
        ...prev,
        [toothId]: transform
      };
      // Also save to localStorage so the panel can pick up changes
      saveToothTransforms(updated);
      return updated;
    });
  };

  // Keyboard controls for tooth transformation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const selectedId = selectedToothData?.id;
      if (!selectedId) return;

      // Don't interfere if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTransform = toothTransforms[selectedId] || getDefaultTransform();
      let newTransform = { ...currentTransform };
      let changed = false;

      const rotationStep = 5 * (Math.PI / 180); // 5 degrees
      const positionStep = 0.05;
      const uniformScaleStep = 0.01;

      switch(event.key.toLowerCase()) {
        // Arrow Keys: Rotation (Pitch & Yaw)
        case 'arrowup':
          event.preventDefault();
          newTransform.rotation = { ...newTransform.rotation, x: newTransform.rotation.x + rotationStep };
          changed = true;
          break;
        case 'arrowdown':
          event.preventDefault();
          newTransform.rotation = { ...newTransform.rotation, x: newTransform.rotation.x - rotationStep };
          changed = true;
          break;
        case 'arrowleft':
          event.preventDefault();
          newTransform.rotation = { ...newTransform.rotation, y: newTransform.rotation.y - rotationStep };
          changed = true;
          break;
        case 'arrowright':
          event.preventDefault();
          newTransform.rotation = { ...newTransform.rotation, y: newTransform.rotation.y + rotationStep };
          changed = true;
          break;

        // WASD: Position (X & Y) - no limits
        case 'w':
          event.preventDefault();
          newTransform.position = { ...newTransform.position, y: newTransform.position.y + positionStep };
          changed = true;
          break;
        case 's':
          event.preventDefault();
          newTransform.position = { ...newTransform.position, y: newTransform.position.y - positionStep };
          changed = true;
          break;
        case 'a':
          event.preventDefault();
          newTransform.position = { ...newTransform.position, x: newTransform.position.x - positionStep };
          changed = true;
          break;
        case 'd':
          event.preventDefault();
          newTransform.position = { ...newTransform.position, x: newTransform.position.x + positionStep };
          changed = true;
          break;

        // Q/E: Position Z (Forward/Back) - no limits
        case 'q':
          event.preventDefault();
          newTransform.position = { ...newTransform.position, z: newTransform.position.z - positionStep };
          changed = true;
          break;
        case 'e':
          event.preventDefault();
          newTransform.position = { ...newTransform.position, z: newTransform.position.z + positionStep };
          changed = true;
          break;

        // R/F: Rotation Z (Roll)
        case 'r':
          event.preventDefault();
          newTransform.rotation = { ...newTransform.rotation, z: newTransform.rotation.z + rotationStep };
          changed = true;
          break;
        case 'f':
          event.preventDefault();
          newTransform.rotation = { ...newTransform.rotation, z: newTransform.rotation.z - rotationStep };
          changed = true;
          break;

        // Z/X: Uniform Scale (no upper limit)
        case 'z':
          event.preventDefault();
          const scaleDown = Math.max(0.01, newTransform.scale.x - uniformScaleStep);
          newTransform.scale = { x: scaleDown, y: scaleDown, z: scaleDown };
          changed = true;
          break;
        case 'x':
          event.preventDefault();
          const scaleUp = newTransform.scale.x + uniformScaleStep; // No max limit
          newTransform.scale = { x: scaleUp, y: scaleUp, z: scaleUp };
          changed = true;
          break;

        // H: Toggle keyboard help
        case 'h':
          if (event.ctrlKey || event.metaKey) return; // Don't interfere with browser shortcuts
          event.preventDefault();
          setShowKeyboardHelp(prev => !prev);
          break;

        // Y: Open transform controls
        case 'y':
          event.preventDefault();
          if (selectedId) {
            setShouldMoveCamera(true);
            setControlsToothId(selectedId);
            setShowTransformControls(true);
          }
          break;
      }

      if (changed) {
        handleTransformChange(selectedId, newTransform);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedToothData, toothTransforms]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      
      <ToothModelGuide />
      
      {/* Tooth Hover Tooltip */}
      {hoveredTooth && (
        <div 
          className="absolute bg-gray-900/95 text-white px-4 py-2 rounded-lg shadow-lg pointer-events-none z-50 border border-gray-700"
          style={{
            left: `${hoveredTooth.x + 15}px`,
            top: `${hoveredTooth.y + 15}px`,
          }}
        >
          <div className="font-semibold text-blue-400">
            {(() => {
              const id = hoveredTooth.id;
              if (id >= 1 && id <= 8) return `Q1-${9 - id} (Universal #${id})`;
              if (id >= 9 && id <= 16) return `Q2-${id - 8} (Universal #${id})`;
              if (id >= 17 && id <= 24) return `Q3-${25 - id} (Universal #${id})`;
              if (id >= 25 && id <= 32) return `Q4-${id - 24} (Universal #${id})`;
              return `Tooth #${id}`;
            })()}
          </div>
          <div className="text-sm text-gray-300">{
            hoveredTooth.id >= 1 && hoveredTooth.id <= 8 ? 'Upper Right' :
            hoveredTooth.id >= 9 && hoveredTooth.id <= 16 ? 'Upper Left' :
            hoveredTooth.id >= 17 && hoveredTooth.id <= 24 ? 'Lower Left' :
            hoveredTooth.id >= 25 && hoveredTooth.id <= 32 ? 'Lower Right' :
            'Unknown'
          }</div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg font-mono text-sm">
        <div className="text-xs text-gray-300 mb-1">Camera Position:</div>
        <div>X: {cameraPosition.x}</div>
        <div>Y: {cameraPosition.y}</div>
        <div>Z: {cameraPosition.z}</div>
      </div>

      {/* Keyboard Help Toggle Button */}
      {selectedToothData && (
        <button
          onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
          className="absolute bottom-4 right-4 bg-blue-600/90 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-lg transition-colors"
          title="Press H to toggle"
        >
          ⌨️ {showKeyboardHelp ? 'Hide' : 'Show'} Keyboard Controls
        </button>
      )}

      {/* Keyboard Controls Help Overlay */}
      {showKeyboardHelp && selectedToothData && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl p-6 z-50 max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-lg">⌨️ Keyboard Controls</h3>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="text-green-400 font-semibold mb-2">📍 Position (WASD + Q/E)</h4>
              <div className="grid grid-cols-2 gap-2 text-gray-300">
                <div>W / S</div><div>Move Up / Down (Y)</div>
                <div>A / D</div><div>Move Left / Right (X)</div>
                <div>Q / E</div><div>Move Forward / Back (Z)</div>
                <div className="col-span-2 text-gray-400 italic text-xs mt-1">
                  ♾️ Unlimited range - move anywhere!
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-blue-400 font-semibold mb-2">🔄 Rotation (Arrow Keys + R/F)</h4>
              <div className="grid grid-cols-2 gap-2 text-gray-300">
                <div>↑ / ↓</div><div>Pitch (X rotation)</div>
                <div>← / →</div><div>Yaw (Y rotation)</div>
                <div>R / F</div><div>Roll (Z rotation)</div>
              </div>
            </div>

            <div>
              <h4 className="text-yellow-400 font-semibold mb-2">📏 Scale (Z/X)</h4>
              <div className="grid grid-cols-2 gap-2 text-gray-300">
                <div>Z / X</div><div>Uniform Scale Down / Up</div>
                <div className="col-span-2 text-gray-400 italic text-xs mt-1">
                  ♾️ No upper limit - scale as big as you want!
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700 text-xs text-gray-400 italic">
              <div>• Press H to toggle this help</div>
              <div>• Single click to select a tooth</div>
              <div>• Double click for camera zoom to tooth</div>
              <div>• Press Y to open Transform Controls panel</div>
              <div>• Changes apply in real-time</div>
              <div>• Don't forget to Save in the panel!</div>
            </div>
          </div>
        </div>
      )}
      
      {showTransformControls && controlsToothId && (
        <ToothTransformControls
          toothId={controlsToothId}
          toothName={getToothModelConfig(controlsToothId)?.name || `Tooth #${controlsToothId}`}
          onTransformChange={handleTransformChange}
          onClose={() => {
            setShowTransformControls(false);
            setControlsToothId(null);
          }}
        />
      )}
    </div>
  );
};

export default memo(DentalChart3D);
