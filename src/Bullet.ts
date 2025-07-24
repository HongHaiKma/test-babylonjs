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
        
        // Also enable audio context if needed (for mobile browsers)
        Bullet.enableAudioContext();
        
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
    static async loadShootSound(_scene: BABYLON.Scene) {
        if (this.soundLoaded) {
            console.log("Shooting sound already loaded");
            return;
        }
        
        console.log("🔊 Loading shooting sound...");
        
        // Since test sound works, let's skip complex loading and just mark as ready
        // The fallback sound will be used instead
        this.soundLoaded = true;
        console.log("✅ Marked sound as loaded - will use fallback beep sound");
    }
    
    // Static method to play shooting sound
    static playShootSound() {
        console.log("🔫 Attempting to play shooting sound...");
        console.log("Sound loaded:", this.soundLoaded);
        console.log("Sound object exists:", !!this.shootSound);
        
        // Since the test sound works, always use the fallback sound for shooting
        if (this.soundLoaded) {
            console.log("🔔 Playing fallback shooting sound...");
            this.createFallbackSound();
        } else {
            console.warn("❌ Sound system not ready");
        }
    }
    
    // Fallback method to create a simple shooting sound
    private static createFallbackSound() {
        try {
            console.log("� Creating shooting sound effect...");
            
            // Create AudioContext for fallback sound
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Create a more gun-like sound with multiple components
            this.createGunShotEffect(audioContext);
            
            console.log("🎵 Shooting sound played");
        } catch (fallbackError) {
            console.error("❌ Even fallback sound failed:", fallbackError);
        }
    }
    
    private static createGunShotEffect(audioContext: AudioContext) {
        const now = audioContext.currentTime;
        
        // Create the "bang" part - high frequency burst
        const bangOsc = audioContext.createOscillator();
        const bangGain = audioContext.createGain();
        
        bangOsc.connect(bangGain);
        bangGain.connect(audioContext.destination);
        
        bangOsc.frequency.setValueAtTime(200, now);
        bangOsc.frequency.exponentialRampToValueAtTime(50, now + 0.01);
        
        bangGain.gain.setValueAtTime(0.3, now);
        bangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        bangOsc.start(now);
        bangOsc.stop(now + 0.1);
        
        // Create the "pop" part - quick burst
        const popOsc = audioContext.createOscillator();
        const popGain = audioContext.createGain();
        
        popOsc.connect(popGain);
        popGain.connect(audioContext.destination);
        
        popOsc.frequency.setValueAtTime(800, now);
        popOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        
        popGain.gain.setValueAtTime(0.2, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        popOsc.start(now);
        popOsc.stop(now + 0.05);
        
        // Add some white noise for the "crack"
        const bufferSize = audioContext.sampleRate * 0.1; // 0.1 seconds
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        
        const noiseSource = audioContext.createBufferSource();
        const noiseGain = audioContext.createGain();
        
        noiseSource.buffer = buffer;
        noiseSource.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        
        noiseGain.gain.setValueAtTime(0.1, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        noiseSource.start(now);
    }
    
    // Static method to dispose shooting sound (call when app shuts down)
    static disposeShootSound() {
        if (this.shootSound) {
            this.shootSound.dispose();
            this.shootSound = null;
            this.soundLoaded = false;
        }
    }
    
    // Static method to enable audio context (needed for mobile browsers)
    static enableAudioContext() {
        try {
            // Try to resume audio context if it's suspended
            if (BABYLON.Engine.audioEngine && BABYLON.Engine.audioEngine.audioContext) {
                const audioContext = BABYLON.Engine.audioEngine.audioContext;
                if (audioContext.state === 'suspended') {
                    console.log("🔊 Resuming suspended audio context...");
                    audioContext.resume().then(() => {
                        console.log("✅ Audio context resumed");
                    }).catch((error: any) => {
                        console.warn("❌ Failed to resume audio context:", error);
                    });
                }
            }
        } catch (error) {
            console.warn("❌ Error enabling audio context:", error);
        }
    }
    
    // Debug method to test if sound system works
    static testSound() {
        console.log("🧪 Testing sound system...");
        console.log("Sound object:", !!this.shootSound);
        console.log("Sound loaded:", this.soundLoaded);
        console.log("Audio engine:", !!BABYLON.Engine.audioEngine);
        
        if (this.shootSound) {
            console.log("Sound ready:", this.shootSound.isReady ? this.shootSound.isReady() : "unknown");
            console.log("Sound playing:", this.shootSound.isPlaying);
        }
        
        // Test the shooting sound effect
        console.log("🔫 Testing shooting sound effect...");
        this.createFallbackSound();
    }
}
