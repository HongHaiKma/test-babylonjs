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
        this.mesh.physicsImpostor.setLinearVelocity(forward.scale(speed * 20));
        
        // Add collision detection using registerOnPhysicsCollide
        this.mesh.physicsImpostor.registerOnPhysicsCollide(null, (_, collided) => {
            const collidedMesh = collided.object as BABYLON.AbstractMesh;
            console.log("Bullet hit:", collidedMesh.name);
            // Destroy the collided object if it's a box
            if (collidedMesh.name?.startsWith("box_")) {
                collidedMesh.dispose();
            }
            // Destroy the bullet
            this.dispose();
        });
        
        this.observer = this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    update() {
        // Dispose bullet if too far from origin
        if (BABYLON.Vector3.Distance(this.mesh.position, BABYLON.Vector3.Zero()) > 50) {
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
