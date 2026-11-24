import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const FaceAnchoringAR = ({ arFrameData, onStopAR }) => {
  const frameName = arFrameData?.name || "Loading";
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const glassesModelRef = useRef(null);
  const faceLandmarkerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(`Loading AR for: ${frameName}...`);
  const [faceDetected, setFaceDetected] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ x: 0, y: 0, z: 0, scale: 0, modelSize: 0 });
  const [showControls, setShowControls] = useState(true);

  // USER CONTROL STATES
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [positionZ, setPositionZ] = useState(0);
  const [scaleMultiplier, setScaleMultiplier] = useState(1.0);

  // USE REFS FOR CONTROLS SO THEY DON'T TRIGGER RE-RENDERS
  const controlsRef = useRef({
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    scaleMultiplier: 1.0
  });

  // Update refs when state changes
  useEffect(() => {
    controlsRef.current = { positionX, positionY, positionZ, scaleMultiplier };
  }, [positionX, positionY, positionZ, scaleMultiplier]);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const videoStreamRef = useRef(null);
  
  const smoothPos = useRef(new THREE.Vector3(0, 0, 0));
  const smoothScale = useRef(1);
  const smoothRot = useRef(new THREE.Quaternion());
  
  const modelBaseScale = useRef(1);

  useEffect(() => {
    sceneRef.current = new THREE.Scene();
    let animationStarted = false;
    let frameCount = 0;

    const initializeAR = async () => {
      try {
        setMessage("Loading face detection...");
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });
        faceLandmarkerRef.current = landmarker;

        if (!containerRef.current) return;
        const container = containerRef.current;
        const width = container.clientWidth || 640;
        const height = container.clientHeight || 480;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
        camera.position.set(0, 0, 600);
        cameraRef.current = camera;

        sceneRef.current.add(new THREE.AmbientLight(0xffffff, 2.5));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        directionalLight.position.set(10, 10, 10);
        sceneRef.current.add(directionalLight);

        setMessage("Loading 3D model...");
        const loader = new GLTFLoader();
        const modelUrl = `http://localhost:5000${arFrameData.model_3d_file}`;

        loader.load(
          modelUrl,
          (gltf) => {
            const model = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            console.log("📏 Model:", size.x.toFixed(2), "x", size.y.toFixed(2), "x", size.z.toFixed(2));
            
            model.position.sub(center);
            
            const maxDimension = Math.max(size.x, size.y, size.z);
            const targetSize = 25;
            const normalizeScale = targetSize / maxDimension;
            
            modelBaseScale.current = normalizeScale;
            model.scale.set(normalizeScale, normalizeScale, normalizeScale);
            
            console.log("🔧 Normalized scale:", normalizeScale.toFixed(4));
            
            model.traverse((child) => {
  if (child.isMesh) {
    const originalMaterial = child.material;
    
    child.material = new THREE.MeshStandardMaterial({
      color: originalMaterial.color || 0x333333,
      metalness: originalMaterial.metalness !== undefined ? originalMaterial.metalness : 0.8,
      roughness: originalMaterial.roughness !== undefined ? originalMaterial.roughness : 0.2,
      transparent: originalMaterial.transparent || false,
      opacity: originalMaterial.opacity !== undefined ? originalMaterial.opacity : 1.0,
      side: THREE.DoubleSide,
      map: originalMaterial.map || null,
      alphaMap: originalMaterial.alphaMap || null
    });
    child.frustumCulled = false;
  }
});
            
            model.position.set(0, 0, 0);
            model.visible = true;
            
            sceneRef.current.add(model);
            glassesModelRef.current = model;

            setMessage("Starting camera...");
            navigator.mediaDevices.getUserMedia({ 
              video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
            }).then((stream) => {
              videoStreamRef.current = stream;
              const video = videoRef.current;
              video.srcObject = stream;
              video.onloadedmetadata = () => {
                video.play();
                setLoading(false);
                setMessage("AR Active!");
                if (!animationStarted) {
                  animationStarted = true;
                  animate();
                }
              };
            }).catch((err) => {
              setMessage(`Camera error: ${err.message}`);
              setLoading(false);
            });
          },
          undefined,
          (error) => {
            setMessage(`Model failed: ${error.message}`);
            setLoading(false);
          }
        );
      } catch (error) {
        setMessage(`Error: ${error.message}`);
        setLoading(false);
      }
    };

    const animate = () => {
      const video = videoRef.current;
      const landmarker = faceLandmarkerRef.current;
      const model = glassesModelRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;

      if (!renderer || !camera || !scene) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      frameCount++;

      if (video && video.readyState === 4 && landmarker && model) {
        try {
          const results = landmarker.detectForVideo(video, Date.now());

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            setFaceDetected(true);
            const landmarks = results.faceLandmarks[0];
            
            const leftEyeOuter = landmarks[33];
            const rightEyeOuter = landmarks[263];
            const noseBridge = landmarks[168];
            const forehead = landmarks[10];
            const noseTip = landmarks[1];
            
            const leftEyeVec = new THREE.Vector3(leftEyeOuter.x, leftEyeOuter.y, leftEyeOuter.z);
            const rightEyeVec = new THREE.Vector3(rightEyeOuter.x, rightEyeOuter.y, rightEyeOuter.z);
            const noseBridgeVec = new THREE.Vector3(noseBridge.x, noseBridge.y, noseBridge.z);
            const foreheadVec = new THREE.Vector3(forehead.x, forehead.y, forehead.z);
            const noseTipVec = new THREE.Vector3(noseTip.x, noseTip.y, noseTip.z);

            const anchorPoint = new THREE.Vector3()
              .addVectors(
                foreheadVec.clone().multiplyScalar(0.7),
                noseBridgeVec.clone().multiplyScalar(0.3)
              );

            const xAxis = new THREE.Vector3().subVectors(rightEyeVec, leftEyeVec).normalize();
            const yApprox = new THREE.Vector3().subVectors(foreheadVec, noseTipVec).normalize();
            const zAxis = new THREE.Vector3().crossVectors(xAxis, yApprox).normalize();
            const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
            
            const faceRotationMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
            const faceQuaternion = new THREE.Quaternion().setFromRotationMatrix(faceRotationMatrix);
            
            const baseRotation = new THREE.Euler(Math.PI, 0, 0, 'XYZ');
            const baseQuaternion = new THREE.Quaternion().setFromEuler(baseRotation);
            const finalQuaternion = baseQuaternion.clone().multiply(faceQuaternion);

            // READ FROM REFS (NO RE-RENDER)
            const controls = controlsRef.current;
            const targetX = (anchorPoint.x - 0.5) * 800 + controls.positionX;
            const targetY = -(anchorPoint.y - 0.33) * 650 + controls.positionY;
            const targetZ = -anchorPoint.z * 1200 - 60 + controls.positionZ;

            const eyeDistance = Math.sqrt(
              Math.pow(rightEyeOuter.x - leftEyeOuter.x, 2) +
              Math.pow(rightEyeOuter.y - leftEyeOuter.y, 2) +
              Math.pow(rightEyeOuter.z - leftEyeOuter.z, 2)
            );
            
            const adaptiveMultiplier = 400 / modelBaseScale.current;
            const targetScale = eyeDistance * adaptiveMultiplier * controls.scaleMultiplier;

            const smoothFactor = 0.35;
            smoothPos.current.x += (targetX - smoothPos.current.x) * smoothFactor;
            smoothPos.current.y += (targetY - smoothPos.current.y) * smoothFactor;
            smoothPos.current.z += (targetZ - smoothPos.current.z) * smoothFactor;
            smoothScale.current += (targetScale - smoothScale.current) * smoothFactor;
            smoothRot.current.slerp(finalQuaternion, smoothFactor);

            model.position.copy(smoothPos.current);
            model.scale.setScalar(smoothScale.current);
            model.quaternion.copy(smoothRot.current);
            model.visible = true;

            if (frameCount % 15 === 0) {
              setDebugInfo({
                x: smoothPos.current.x.toFixed(0),
                y: smoothPos.current.y.toFixed(0),
                z: smoothPos.current.z.toFixed(0),
                scale: smoothScale.current.toFixed(2),
                modelSize: modelBaseScale.current.toFixed(4)
              });
            }
          } else {
            setFaceDetected(false);
            model.visible = false;
          }
        } catch (e) {
          if (frameCount % 60 === 0) {
            console.error("Tracking error:", e);
          }
        }
      }

      renderer.render(scene, camera);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    initializeAR();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (rendererRef.current && containerRef.current) {
        if (containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
      if (sceneRef.current) {
        while(sceneRef.current.children.length > 0) { 
          sceneRef.current.remove(sceneRef.current.children[0]); 
        }
      }
    };
  }, []); // EMPTY DEPENDENCY ARRAY - only runs once!

  const resetControls = () => {
    setPositionX(0);
    setPositionY(0);
    setPositionZ(0);
    setScaleMultiplier(1.0);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card shadow-lg">
        <div className="card-header bg-dark text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">🕶️ AR: {frameName}</h5>
            <div>
              {faceDetected ? (
                <span className="badge bg-success me-2">✓ FITTED</span>
              ) : (
                <span className="badge bg-warning me-2">⚠ NO FACE</span>
              )}
              <button 
                className="btn btn-sm btn-info me-2" 
                onClick={() => setShowControls(!showControls)}
              >
                {showControls ? '🎛️ Hide' : '🎛️ Show'} Controls
              </button>
              <button className="btn btn-sm btn-danger" onClick={onStopAR}>
                ← Back
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
          <div style={{
            position: 'relative',
            width: '100%',
            height: '480px',
            backgroundColor: '#000',
            overflow: 'hidden'
          }}>
            <video
              ref={videoRef}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
              autoPlay
              playsInline
              muted
            />
            <div ref={containerRef} style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10,
              transform: 'scaleX(-1)'
            }} />
            
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div className="text-center text-white">
                  <div className="spinner-border mb-3" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h5>{message}</h5>
                </div>
              </div>
            )}
            
            {!loading && faceDetected && (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: '#0f0',
                padding: '10px',
                borderRadius: '8px',
                zIndex: 15,
                fontSize: '11px',
                fontFamily: 'monospace',
                lineHeight: '1.5'
              }}>
                <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>📊 Forehead Anchor</div>
                <div>X: {debugInfo.x}</div>
                <div>Y: {debugInfo.y}</div>
                <div>Z: {debugInfo.z}</div>
                <div>Scale: {debugInfo.scale}</div>
                <div style={{ color: '#ff0', marginTop: '3px' }}>Norm: {debugInfo.modelSize}</div>
              </div>
            )}
            
            {!loading && !faceDetected && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(255, 193, 7, 0.95)',
                color: '#000',
                padding: '15px 30px',
                borderRadius: '25px',
                zIndex: 15,
                fontWeight: 'bold',
              }}>
                👤 Show your face
              </div>
            )}
            
            {!loading && faceDetected && (
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(40, 167, 69, 0.95)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                zIndex: 15,
                fontSize: '13px',
                fontWeight: 'bold',
              }}>
                ✓ Forehead Anchored
              </div>
            )}
          </div>
        </div>
        
        <div className="card-footer bg-dark text-white">
          <small>🎯 Anchor: 70% Forehead + 30% Nose Bridge • Real-time adjustable</small>
        </div>
      </div>

      {/* CONTROL PANEL */}
      {showControls && (
        <div className="card mt-3">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h6 className="mb-0">🎛️ Real-time Controls</h6>
            <button className="btn btn-sm btn-warning" onClick={resetControls}>
              🔄 Reset All
            </button>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {/* Position X */}
              <div className="col-md-6">
                <label className="form-label small fw-bold">
                  ↔️ Position X: <span className="text-primary">{positionX}</span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="-500"
                  max="500"
                  step="5"
                  value={positionX}
                  onChange={(e) => setPositionX(Number(e.target.value))}
                />
                <small className="text-muted">Left/Right adjustment (-500 to +500)</small>
              </div>

              {/* Position Y */}
              <div className="col-md-6">
                <label className="form-label small fw-bold">
                  ↕️ Position Y: <span className="text-primary">{positionY}</span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="-500"
                  max="500"
                  step="5"
                  value={positionY}
                  onChange={(e) => setPositionY(Number(e.target.value))}
                />
                <small className="text-muted">Up/Down adjustment (-500 to +500)</small>
              </div>

              {/* Position Z */}
              <div className="col-md-6">
                <label className="form-label small fw-bold">
                  🔍 Position Z: <span className="text-primary">{positionZ}</span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="-500"
                  max="500"
                  step="5"
                  value={positionZ}
                  onChange={(e) => setPositionZ(Number(e.target.value))}
                />
                <small className="text-muted">Closer/Further adjustment (-500 to +500)</small>
              </div>

              {/* Scale Multiplier */}
              <div className="col-md-6">
                <label className="form-label small fw-bold">
                  📏 Size: <span className="text-primary">{scaleMultiplier.toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="0.01"
                  max="100.0"
                  step="0.1"
                  value={scaleMultiplier}
                  onChange={(e) => setScaleMultiplier(Number(e.target.value))}
                />
                <small className="text-muted">Scale multiplier (0.1x - 10.0x)</small>
              </div>
            </div>

            <div className="alert alert-info mt-3 mb-0 small">
              <strong>💡 Tips:</strong>
              <ul className="mb-0 mt-2">
                <li>Adjust <strong>Position X/Y</strong> to move the model on your face</li>
                <li>Use <strong>Position Z</strong> to bring model closer/further</li>
                <li>Change <strong>Size</strong> to scale the model bigger/smaller</li>
                <li>Click <strong>Reset All</strong> to return to defaults</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="card mt-3">
        <div className="card-body">
          <h6 className="text-success">✨ Features:</h6>
          <div className="row">
            <div className="col-md-6">
              <ul className="small mb-0">
                <li>✓ Anchored to FOREHEAD (landmark 10)</li>
                <li>✓ Blended with nose bridge (landmark 168)</li>
                <li>✓ Real-time position adjustment</li>
                <li>✓ Real-time size control</li>
              </ul>
            </div>
            <div className="col-md-6">
              <div className="alert alert-success mb-0 small">
                <strong>🎉 Now with live controls!</strong>
                <div className="mt-1">Adjust position and size on-the-fly to fit any model to any face perfectly.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceAnchoringAR;