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
            referenceSpaceType: "local"
        },
        optionalFeatures: true
    });

    // Access the AR camera
    const xrCamera = xr.baseExperience.camera;
    console.log("AR Camera ready:", xrCamera);

    const loadModel = async () => {
        // const modelUrl = "https://xensear-arworld.s3.ap-southeast-5.amazonaws.com/ar-world/AssetBundles/BabylonModelTest/";
        const modelUrl = "https://dl.dropbox.com/scl/fi/h0e15ypqmcm8f63gq3tzl/RingRing.glb?rlkey=1jnot0nw8rl22voz55fv4542l&st=0rihhho0";
        
        const fileName = "RingRing.glb";
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

    console.log("Anchor Feature");

    // hitTest.onHitTestResultObservable.add(async (results) => {
    //     if (results.length > 0 && loadedModel) {
            // const hit = results[0];
            let position = new Vector3();
            position = xrCamera.getForwardRay().direction.scale(3.5);

            // hit.transformationMatrix.decompose(undefined, undefined, position);

            // Move mesh to hit test position
            // loadedModel.position = position;

            // // Anchor mesh if supported
            // if (anchorFeature && anchorFeature.attachAnchor) {
            //     const anchor = await anchorFeature.attachAnchor(hit.transformationMatrix, loadedModel);
            //     loadedModel.parent = anchor;
            // }

            // Anchor mesh if supported
            // if (hit.createAnchor) {
            //     const anchor = await hit.createAnchor();
            //     loadedModel.parent = anchor;
            // }
            // if (anchorFeature && anchorFeature.) {
            await anchorFeature.addAnchorAtPositionAndRotationAsync(position, BABYLON.Quaternion.Identity()).then((anchor) => {
                console.log("Anchor created:", anchor)  ;
                const boxTransformNode = new BABYLON.TransformNode('boxTransformNode');
                boxTransformNode.position = position;
                loadedModel.parent = boxTransformNode;
                loadedModel.position = Vector3.Zero();
                loadedModel.isVisible = true;
                anchor.attachedNode = boxTransformNode;
            });
        // }
    // });

    // Start the render loop
    engine.runRenderLoop(() => {
        // if (loadedModel) {
            // loadedModel.rotation.x += 10;
            // loadedModel.rotation.y += 10;
            // loadedModel.rotation.z += 10;
        // }
        scene.render();
    });
};

createXR();

// Adjust engine on window resize
window.addEventListener("resize", () => {
  engine.resize();
});