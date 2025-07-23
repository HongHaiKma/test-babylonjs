import * as BABYLON from "@babylonjs/core";
import { Explosion } from "./Explosion";

export class Bullet {
    mesh: BABYLON.AbstractMesh;
    forward: BABYLON.Vector3;
    speed: number;
    scene: BABYLON.Scene;
    observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    collisionObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.AbstractMesh>>;

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
        
        // Set up collision detection using moveWithCollisions
        this.mesh.checkCollisions = true;
        
        // Set collision ellipsoid (defines the collision shape around the bullet)
        this.mesh.ellipsoid = new BABYLON.Vector3(0.2, 0.2, 0.2); // Adjust size as needed
        
        // Set up collision event handling with onCollideObservable
        this.collisionObserver = this.mesh.onCollideObservable.add((collidedMesh) => {
            console.log("Bullet collision detected with:", collidedMesh.name);
            this.handleCollisionWithMesh(collidedMesh);
        });
        
        // Log initial position
        console.log("Bullet created at:", this.mesh.position);
        
        // Store reference for collision detection in update loop
        this.observer = this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    update() {
        // Calculate movement vector
        const moveVector = this.forward.scale(this.speed);
        
        // Use moveWithCollisions - onCollideObservable will handle collision events
        this.mesh.moveWithCollisions(moveVector);
        
        // Debug: Log current position periodically
        if (Math.random() < 0.01) { // Log ~1% of frames to avoid spam
            console.log("Bullet position:", this.mesh.position);
        }
        
        // Dispose bullet if too far from origin
        if (BABYLON.Vector3.Distance(this.mesh.position, BABYLON.Vector3.Zero()) > 50) {
            console.log("Bullet disposed - too far from origin");
            this.dispose();
        }
    }
    
    handleCollisionWithMesh(collidedMesh: BABYLON.AbstractMesh) {
        const distance = BABYLON.Vector3.Distance(this.mesh.position, collidedMesh.position);
        console.log("Bullet hit:", collidedMesh.name, "at distance:", distance);
        
        // Create explosion at collision point
        const explosionPosition = this.mesh.position.clone();
        Explosion.createExplosion(explosionPosition, this.scene);
        
        // Destroy the collided object if it's a box
        if (collidedMesh.name.startsWith("box_")) {
            console.log("Destroying box:", collidedMesh.name);
            
            // Small delay before destroying box to let explosion start
            setTimeout(() => {
                if (collidedMesh && !collidedMesh.isDisposed()) {
                    collidedMesh.dispose();
                }
            }, 50);
        }
        
        // Destroy the bullet
        this.dispose();
    }    
    
    dispose() {
        // Clean up collision observer
        if (this.collisionObserver) {
            this.mesh.onCollideObservable.remove(this.collisionObserver);
            this.collisionObserver = null;
        }
        
        // Clean up physics impostor if it exists
        if (this.mesh.physicsImpostor) {
            this.mesh.physicsImpostor.dispose();
        }
        
        // Disable collision detection
        this.mesh.checkCollisions = false;
        
        // Dispose mesh
        this.mesh.dispose();
        
        // Remove observer
        if (this.observer) {
            this.scene.onBeforeRenderObservable.remove(this.observer);
            this.observer = null;
        }
    }
}
