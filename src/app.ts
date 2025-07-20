import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, AbstractMesh } from "@babylonjs/core";
import { WebXRDefaultExperience } from "@babylonjs/core/XR/webXRDefaultExperience";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/core/XR/features/WebXRHitTest";
import "@babylonjs/core/XR/features/WebXRAnchorSystem";

// Create and append canvas to the DOM
var canvas = document.createElement("canvas");
canvas.style.width = "100vw";
canvas.style.height = "100vh";
document.body.appendChild(canvas);

// Initialize the engine and scene
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

// Add a light to the scene
const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

let loadedModel: AbstractMesh;

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

    const loadModel = async () => {
        // const modelUrl = "https://xensear-arworld.s3.ap-southeast-5.amazonaws.com/ar-world/AssetBundles/BabylonModelTest/";
        // const modelUrl = "https://dl.dropbox.com/scl/fi/h0e15ypqmcm8f63gq3tzl/RingRing.glb?rlkey=1jnot0nw8rl22voz55fv4542l&st=0rihhho0";
        const modelUrl = "https://dl.dropbox.com/scl/fi/sy3d2do6230xr7d6m4qze/bullet.glb?rlkey=nyjocnqem4gk93ieozmpn5lx1&st=z3ryay9m";
        
        // const fileName = "RingRing.glb";
        const fileName = "bullet.glb";
        const result = await SceneLoader.ImportMeshAsync("", modelUrl, "", scene);
        loadedModel = result.meshes[0];
        // loadedModel.position = xrCamera.position.add(xrCamera.getForwardRay().direction.scale(3.5));
    };

    await loadModel();

    console.log("Model loaded");

    // const hitTest = xr.baseExperience.featuresManager.enableFeature(
    //     "hit-test",
    //     "latest"
    // ) as BABYLON.WebXRHitTest;

    // Enable anchor feature
    const anchorFeature = xr.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRAnchorSystem.Name,
        "latest"
    ) as BABYLON.WebXRAnchorSystem;

    console.log("Anchor system compatibility:", anchorFeature.isCompatible());

    let position = new Vector3();
    position = xrCamera.getForwardRay().direction.scale(3.5);

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
        })
    })

    const anchors = anchorFeature.anchors;

    // Log the number of anchors
    console.log("Number of anchors:", anchors.length);

    // List all anchors
    anchors.forEach((anchor) => {
        console.log("Anchor:", anchor);
        // You can access anchor.attachedNode, anchor.id, etc.
    });

    // Preload bullet model from Dropbox
    let bulletModel: BABYLON.AbstractMesh | null = null;
    async function preloadBulletModel() {
        if (!bulletModel) {
            const bulletUrl = "https://dl.dropbox.com/scl/fi/sy3d2do6230xr7d6m4qze/bullet.glb?rlkey=nyjocnqem4gk93ieozmpn5lx1&st=p1fhzsif";
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", bulletUrl, "", scene);
            bulletModel = result.meshes[0];
            bulletModel.setEnabled(false); // Hide the template
        }
    }

    await preloadBulletModel();

    // Create 10 boxes with colliders arranged in a circle around camera
    function createBoxCircle() {
        const numberOfBoxes = 10;
        const radius = 10;
        const boxes: BABYLON.Mesh[] = [];

        for (let i = 0; i < numberOfBoxes; i++) {
            // Calculate angle for each box
            const angle = (i / numberOfBoxes) * 2 * Math.PI;
            
            // Create box
            const box = BABYLON.MeshBuilder.CreateBox(`box_${i}`, { size: 1 }, scene);
            
            // Position box in circle around camera
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            box.position = new BABYLON.Vector3(
                xrCamera.position.x + x,
                xrCamera.position.y, // Same height as camera
                xrCamera.position.z + z
            );
            
            // Create material for the box (optional - makes them visible)
            const material = new BABYLON.StandardMaterial(`boxMaterial_${i}`, scene);
            material.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
            box.material = material;
            
            // Enable physics collider
            box.physicsImpostor = new BABYLON.PhysicsImpostor(box, BABYLON.PhysicsImpostor.BoxImpostor, { 
                mass: 1, 
                restitution: 0.7 
            }, scene);
            
            boxes.push(box);
        }
        
        return boxes;
    }

    // Enable physics engine for colliders
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
    
    // Create the boxes after XR is initialized
    const boxes = createBoxCircle();
    console.log(`Created ${boxes.length} boxes in circle formation`);

    function shootBullet() {
        if (!bulletModel) return;
        // Clone the bullet model
        const bullet = bulletModel.clone("bulletInstance", null);
        bullet.setEnabled(true);
        
        // Set bullet start distance from camera (e.g., 2 units away)
        const startDistance = 2.0;
        const cameraForward = xrCamera.getForwardRay().direction.normalize();
        bullet.position = xrCamera.position.clone().add(cameraForward.scale(startDistance));
        
        // Rotate bullet to face camera forward direction
        bullet.lookAt(bullet.position.add(cameraForward));
        
        const forward = cameraForward.scale(3.5);
        const speed = 0.5;
        // Move the bullet every frame
        const observer = scene.onBeforeRenderObservable.add(() => {
            bullet.position.addInPlace(forward.scale(speed));
            if (BABYLON.Vector3.Distance(bullet.position, xrCamera.position) > 50) {
                bullet.dispose();
                scene.onBeforeRenderObservable.remove(observer);
            }
        });
    }

    scene.onPointerDown = () => {
        shootBullet();
    };

    // Start the render loop
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