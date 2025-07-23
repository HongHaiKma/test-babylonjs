import * as BABYLON from "@babylonjs/core";
import { Explosion } from "./Explosion";

export class Bullet {
    mesh: BABYLON.AbstractMesh;
    forward: BABYLON.Vector3;
    speed: number;
    scene: BABYLON.Scene;
    observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>;
    collisionObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.AbstractMesh>>;
    private static shootSound: BABYLON.Sound | null = null;
    private static soundLoaded: boolean = false;

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
        
        // Play shooting sound
        Bullet.playShootSound();
        
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
    
    // Static method to preload shooting sound
    static async loadShootSound(scene: BABYLON.Scene) {
        if (this.soundLoaded) return;
        
        // Array of sound URLs to try (with fallbacks)
        const soundUrls = [
            // Your primary Dropbox URL for shooting sound
            "https://dl.dropbox.com/scl/fi/a2adgfbmgj7wuc0e73dzm/Shoot.ogg?rlkey=vdh8d9h0x8urb2hejqk8dndcx&st=ww56z5e6",
            // Fallback URLs for shooting sounds
            "https://www.soundjay.com/misc/sounds/bell_ringing_05.wav",
            "https://opengameart.org/sites/default/files/shoot.wav"
        ];
        
        this.tryLoadShootSound(soundUrls, 0, scene);
    }
    
    private static tryLoadShootSound(urls: string[], index: number, scene: BABYLON.Scene) {
        if (index >= urls.length) {
            console.warn("All shooting sound URLs failed to load");
            this.soundLoaded = true; // Mark as attempted
            return;
        }
        
        try {
            this.shootSound = new BABYLON.Sound(
                "shootSound",
                urls[index],
                scene,
                () => {
                    console.log(`✅ Shooting sound loaded from: ${urls[index]}`);
                    this.soundLoaded = true;
                },
                {
                    volume: 0.3,
                    spatialSound: false, // Global sound for shooting
                    autoplay: false,
                    loop: false
                }
            );
            
        } catch (error) {
            console.warn(`Error loading shoot sound from ${urls[index]}:`, error);
            this.tryLoadShootSound(urls, index + 1, scene);
        }
    }
    
    // Static method to play shooting sound
    static playShootSound() {
        if (this.shootSound && this.soundLoaded) {
            try {
                // Stop previous sound if still playing
                if (this.shootSound.isPlaying) {
                    this.shootSound.stop();
                }
                this.shootSound.play();
            } catch (error) {
                console.warn("Could not play shooting sound:", error);
            }
        }
    }
    
    // Static method to dispose shooting sound (call when app shuts down)
    static disposeShootSound() {
        if (this.shootSound) {
            this.shootSound.dispose();
            this.shootSound = null;
            this.soundLoaded = false;
        }
    }
}
