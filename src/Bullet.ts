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
    static async loadShootSound(scene: BABYLON.Scene) {
        if (this.soundLoaded) {
            console.log("Shooting sound already loaded");
            return;
        }
        
        console.log("🔊 Loading shooting sound...");
        
        // Array of sound URLs to try (with fallbacks)
        const soundUrls = [
            // Your primary Dropbox URL for shooting sound
            "https://dl.dropbox.com/scl/fi/a2adgfbmgj7wuc0e73dzm/Shoot.ogg?rlkey=vdh8d9h0x8urb2hejqk8dndcx&st=ww56z5e6",
            // Working fallback URL (known to work)
            "https://playground.babylonjs.com/sounds/gunshot.wav",
            // Another fallback
            "https://www.soundjay.com/misc/sounds/bell_ringing_05.wav"
        ];
        
        // Try to load sound with Promise for better async handling
        return new Promise<void>((resolve) => {
            this.tryLoadShootSoundWithPromise(soundUrls, 0, scene, resolve);
        });
    }
    
    private static tryLoadShootSoundWithPromise(urls: string[], index: number, scene: BABYLON.Scene, resolve: () => void) {
        if (index >= urls.length) {
            console.warn("❌ All shooting sound URLs failed to load");
            this.soundLoaded = true; // Mark as attempted
            resolve();
            return;
        }
        
        console.log(`🔄 Trying to load shooting sound from: ${urls[index]}`);
        
        try {
            this.shootSound = new BABYLON.Sound(
                "shootSound",
                urls[index],
                scene,
                () => {
                    console.log(`✅ Shooting sound loaded successfully from: ${urls[index]}`);
                    this.soundLoaded = true;
                    resolve();
                },
                {
                    volume: 0.5,
                    spatialSound: false,
                    autoplay: false,
                    loop: false
                }
            );
            
            // If loading fails, try next URL after timeout
            setTimeout(() => {
                if (!this.soundLoaded) {
                    console.warn(`⏰ Timeout loading sound from: ${urls[index]}, trying next...`);
                    this.tryLoadShootSoundWithPromise(urls, index + 1, scene, resolve);
                }
            }, 3000); // 3 second timeout
            
        } catch (error) {
            console.warn(`❌ Error loading shoot sound from ${urls[index]}:`, error);
            this.tryLoadShootSoundWithPromise(urls, index + 1, scene, resolve);
        }
    }
    
    // Static method to play shooting sound
    static playShootSound() {
        console.log("🔫 Attempting to play shooting sound...");
        console.log("Sound loaded:", this.soundLoaded);
        console.log("Sound object exists:", !!this.shootSound);
        
        if (!this.shootSound) {
            console.warn("❌ No shooting sound object available");
            return;
        }
        
        if (!this.soundLoaded) {
            console.warn("❌ Shooting sound not yet loaded, trying to play anyway...");
        }
        
        try {
            // Check if sound is ready
            if (this.shootSound.isReady && this.shootSound.isReady()) {
                console.log("✅ Sound is ready, playing...");
                
                // Stop previous sound if still playing
                if (this.shootSound.isPlaying) {
                    this.shootSound.stop();
                }
                
                this.shootSound.play();
                console.log("🎵 Shooting sound played successfully!");
            } else {
                console.warn("⏳ Sound not ready yet, will try to play anyway...");
                this.shootSound.play();
            }
        } catch (error) {
            console.error("❌ Could not play shooting sound:", error);
            
            // Try creating a simple beep sound as fallback
            this.createFallbackSound();
        }
    }
    
    // Fallback method to create a simple beep sound
    private static createFallbackSound() {
        try {
            console.log("🔔 Creating fallback beep sound...");
            
            // Create AudioContext for fallback sound
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz tone
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            
            console.log("🎵 Fallback sound played");
        } catch (fallbackError) {
            console.error("❌ Even fallback sound failed:", fallbackError);
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
        
        // Try to play a simple test sound
        this.createFallbackSound();
    }
}
