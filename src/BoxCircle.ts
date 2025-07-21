import * as BABYLON from "@babylonjs/core";

export class BoxCircle {
    boxes: BABYLON.Mesh[] = [];
    constructor(scene: BABYLON.Scene, numberOfBoxes: number = 10, radius: number = 2) {
        for (let i = 0; i < numberOfBoxes; i++) {
            const angle = (i / numberOfBoxes) * 2 * Math.PI;
            const box = BABYLON.MeshBuilder.CreateBox(`box_${i}`, { size: 0.5 }, scene);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius + 5;
            box.position = new BABYLON.Vector3(x, 1.5, z);
            const material = new BABYLON.StandardMaterial(`boxMaterial_${i}`, scene);
            material.diffuseColor = new BABYLON.Color3(1, 1, 0);
            material.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0);
            box.material = material;
            
            // Add physics impostor for collision detection
            box.physicsImpostor = new BABYLON.PhysicsImpostor(box, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.7 }, scene);
            
            this.boxes.push(box);
        }
    }
}
