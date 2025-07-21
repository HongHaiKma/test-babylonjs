import * as BABYLON from "@babylonjs/core";

export class Bullet {
    mesh: BABYLON.AbstractMesh;
    forward: BABYLON.Vector3;
    speed: number;
    scene: BABYLON.Scene;
    observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;

    constructor(template: BABYLON.AbstractMesh, startPosition: BABYLON.Vector3, forward: BABYLON.Vector3, speed: number, scene: BABYLON.Scene) {
        const clonedMesh = template.clone("bulletInstance", null);
        if (!clonedMesh) {
            throw new Error("Failed to clone bullet mesh");
        }
        this.mesh = clonedMesh;
        this.mesh.setEnabled(true);
        this.mesh.position = startPosition.clone();
        this.mesh.lookAt(this.mesh.position.add(forward));
        this.forward = forward;
        this.speed = speed;
        this.scene = scene;
        
        // Add physics impostor for collision detection
        this.mesh.physicsImpostor = new BABYLON.PhysicsImpostor(this.mesh, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.3 }, scene);
        
        // Set initial velocity using physics
        const initialVelocity = forward.scale(speed * 20);
        console.log("Setting bullet velocity:", initialVelocity);
        this.mesh.physicsImpostor.setLinearVelocity(initialVelocity);
        
        // Log initial position
        console.log("Bullet created at:", this.mesh.position);
        
        // Store reference for collision detection in update loop
        this.observer = this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    update() {
        // Debug: Log current position periodically
        if (Math.random() < 0.01) { // Log ~1% of frames to avoid spam
            console.log("Bullet position:", this.mesh.position);
            if (this.mesh.physicsImpostor) {
                console.log("Bullet velocity:", this.mesh.physicsImpostor.getLinearVelocity());
            }
        }
        
        // Check for intersections with other meshes (collision detection)
        const boxes = this.scene.meshes.filter(mesh => mesh.name.startsWith("box_"));
        for (const box of boxes) {
            if (this.mesh.intersectsMesh(box as BABYLON.AbstractMesh, false)) {
                console.log("Bullet hit:", box.name);
                box.dispose();
                this.dispose();
                return;
            }
        }
        
        // Use physics movement primarily, fallback to manual if needed
        // if (!this.mesh.physicsImpostor || this.mesh.physicsImpostor.getLinearVelocity().length() < 0.1) {
        //     console.log("Using manual movement fallback");
            // this.mesh.position.addInPlace(this.forward.scale(this.speed));
        // }
        
        // Dispose bullet if too far from origin
        if (BABYLON.Vector3.Distance(this.mesh.position, BABYLON.Vector3.Zero()) > 50) {
            console.log("Bullet disposed - too far from origin");
            this.dispose();
        }
    }

    dispose() {
        if (this.mesh.physicsImpostor) {
            this.mesh.physicsImpostor.dispose();
        }
        this.mesh.dispose();
        if (this.observer) {
            this.scene.onBeforeRenderObservable.remove(this.observer);
            this.observer = null;
        }
    }
}
