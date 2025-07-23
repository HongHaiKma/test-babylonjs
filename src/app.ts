import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, AbstractMesh } from "@babylonjs/core";
import { Bullet } from "./Bullet";
import { BoxCircle } from "./BoxCircle";
import { Explosion } from "./Explosion";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/core/XR/features/WebXRHitTest";
import "@babylonjs/core/XR/features/WebXRAnchorSystem";
import * as CANNON from "cannon";

// Make CANNON available globally
(window as any).CANNON = CANNON;

// Create and append canvas to the DOM
var canvas = document.createElement("canvas");
canvas.style.width = "100vw";
canvas.style.height = "100vh";
document.body.appendChild(canvas);

// Initialize the engine and scene
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.collisionsEnabled = true;

// Enable audio engine
BABYLON.Engine.audioEngine = new BABYLON.AudioEngine();
console.log("🔊 Audio engine initialized:", !!BABYLON.Engine.audioEngine);

// Enable audio context on first user interaction (required by browsers)
let audioEnabled = false;
const enableAudio = () => {
    if (!audioEnabled) {
        console.log("🎵 Enabling audio on user interaction...");
        if (BABYLON.Engine.audioEngine && BABYLON.Engine.audioEngine.audioContext) {
            BABYLON.Engine.audioEngine.audioContext.resume();
        }
        Bullet.enableAudioContext();
        audioEnabled = true;
        console.log("✅ Audio enabled");
    }
};

// Add event listeners for user interaction
document.addEventListener('click', enableAudio);
document.addEventListener('touchstart', enableAudio);

// Add debug button for testing sound
const debugButton = document.createElement('button');
debugButton.innerHTML = '🧪 Test Sound';
debugButton.style.position = 'fixed';
debugButton.style.top = '10px';
debugButton.style.left = '10px';
debugButton.style.zIndex = '1000';
debugButton.style.padding = '10px';
debugButton.style.backgroundColor = '#4CAF50';
debugButton.style.color = 'white';
debugButton.style.border = 'none';
debugButton.style.borderRadius = '5px';
debugButton.onclick = () => {
    console.log("🧪 Debug button clicked - testing sound system");
    enableAudio();
    Bullet.testSound();
    Bullet.playShootSound();
};
document.body.appendChild(debugButton);

// Enable physics engine with no gravity (0, 0, 0) instead of (0, -9.81, 0)
scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), new BABYLON.CannonJSPlugin());

// Add a light to the scene
const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

let loadedModel: AbstractMesh;

// Camera shake effect function
function shakeCamera(camera: BABYLON.Camera, intensity: number = 0.1, duration: number = 300) {
    const originalPosition = camera.position.clone();
    const shakeInterval = 16; // ~60fps
    const shakeSteps = duration / shakeInterval;
    let currentStep = 0;
    
    const shakeTimer = setInterval(() => {
        currentStep++;
        const progress = currentStep / shakeSteps;
        const currentIntensity = intensity * (1 - progress); // Decrease intensity over time
        
        // Random shake offset
        const shakeX = (Math.random() - 0.5) * currentIntensity;
        const shakeY = (Math.random() - 0.5) * currentIntensity;
        const shakeZ = (Math.random() - 0.5) * currentIntensity;
        
        camera.position.x = originalPosition.x + shakeX;
        camera.position.y = originalPosition.y + shakeY;
        camera.position.z = originalPosition.z + shakeZ;
        
        if (currentStep >= shakeSteps) {
            clearInterval(shakeTimer);
            camera.position = originalPosition; // Reset to original position
        }
    }, shakeInterval);
}

// Export the shake function for use in other modules
(window as any).shakeCamera = shakeCamera;

// Function to start the AR experience
const createXR = async () => {
    // Check if immersive-ar sessions are supported
    const arAvailable = await WebXRSessionManager.IsSessionSupportedAsync("immersive-ar");
    console.log("AR available:", arAvailable);

    if (!arAvailable) {
        console.warn("Immersive AR not supported on this device.");
        return;
    }

    // Create the AR experience
    const xr = await WebXRDefaultExperience.CreateAsync(scene, {
        uiOptions: {
            sessionMode: "immersive-ar",  // Enable AR mode
            referenceSpaceType: "local-floor"
        },
        optionalFeatures: true
    });

    // Access the AR camera
    const xrCamera = xr.baseExperience.camera;
    console.log("AR Camera ready:", xrCamera);

    // Modularized functions
    // 1. Anchor setup
    function setupAnchorSystem(xrCamera: BABYLON.Camera, loadedModel: BABYLON.AbstractMesh) {
        const anchorFeature = xr.baseExperience.featuresManager.enableFeature(
            BABYLON.WebXRAnchorSystem.Name,
            "latest"
        ) as BABYLON.WebXRAnchorSystem;
        console.log("Anchor system compatibility:", anchorFeature.isCompatible());
        let position = xrCamera.getForwardRay().direction.scale(3.5);
        const observer = xr.baseExperience.sessionManager.onXRFrameObservable.add(() => {
            anchorFeature.addAnchorAtPositionAndRotationAsync(position, BABYLON.Quaternion.Identity()).then((anchor) => {
                console.log("Anchor created", anchor);
                const node = new BABYLON.TransformNode("anchorNode", scene);
                node.position = position;
                node.rotationQuaternion = BABYLON.Quaternion.Identity();
                anchor.attachedNode = node;
                loadedModel.parent = node;
                loadedModel.position = BABYLON.Vector3.Zero();
                loadedModel.isVisible = true;
                xr.baseExperience.sessionManager.onXRFrameObservable.remove(observer); // run once
            });
        });
        // Log anchors
        const anchors = anchorFeature.anchors;
        console.log("Number of anchors:", anchors.length);
        anchors.forEach((anchor) => {
            console.log("Anchor:", anchor);
        });
    }

    // 2. Bullet preloading
    let bulletModel: BABYLON.AbstractMesh | null = null;
    async function preloadBulletModel() {
        if (!bulletModel) {
            const bulletUrl = "https://dl.dropbox.com/scl/fi/sy3d2do6230xr7d6m4qze/bullet.glb?rlkey=nyjocnqem4gk93ieozmpn5lx1&st=p1fhzsif";
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", bulletUrl, "", scene);
            if (result.meshes[0]) {
                bulletModel = result.meshes[0];
                bulletModel.setEnabled(false);
                console.log("✅ Bullet model loaded successfully");
            } else {
                console.error("Failed to load bullet model");
            }
        }
        
        // Preload shooting sound
        await Bullet.loadShootSound(scene);
    }

    // 3. Bullet shooting
    function shootBullet() {
        if (!bulletModel) return;
        const cameraForward = xrCamera.getForwardRay().direction.normalize();
        const startDistance = 2.0;
        const startPosition = xrCamera.position.clone().add(cameraForward.scale(startDistance));
        const speed = 0.5;
        new Bullet(bulletModel, startPosition, cameraForward, speed, scene);
    }

    // 4. Box circle creation
    function createBoxCircle() {
        new BoxCircle(scene, 10, 2);
    }

    // 5. Event binding
    function bindEvents() {
        scene.onPointerDown = shootBullet;
    }

    // --- Execute modularized logic ---
    await preloadBulletModel();
    createBoxCircle();
    bindEvents();
    // setupAnchorSystem(xrCamera, loadedModel); // Commented out until loadedModel is properly initialized

    engine.runRenderLoop(() => {
        // const worldPosition = loadedModel.getAbsolutePosition();
        // console.log("X: ", worldPosition.x);
        // console.log("Y: ", worldPosition.y);
        // console.log("Z: ", worldPosition.z);
        scene.render();
    });

    
};

createXR();

// Adjust engine on window resize
window.addEventListener("resize", () => {
  engine.resize();
});