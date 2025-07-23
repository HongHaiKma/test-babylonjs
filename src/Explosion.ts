import * as BABYLON from "@babylonjs/core";

export class Explosion {
    particleSystem: BABYLON.ParticleSystem;
    scene: BABYLON.Scene;
    emitter: BABYLON.AbstractMesh;
    private explosionSound: BABYLON.Sound | null = null;
    
    constructor(position: BABYLON.Vector3, scene: BABYLON.Scene) {
        this.scene = scene;
        
        // Create a small invisible emitter mesh at the explosion position
        this.emitter = BABYLON.MeshBuilder.CreateSphere("explosionEmitter", { diameter: 0.1 }, scene);
        this.emitter.position = position.clone();
        this.emitter.isVisible = false;
        
        // Create particle system
        this.particleSystem = new BABYLON.ParticleSystem("explosion", 200, scene);
        
        // Set the emitter
        this.particleSystem.emitter = this.emitter;
        
        // Create particle texture (simple colored particle)
        // this.createParticleTexture();
        
        // Configure particle system
        this.setupParticleSystem();
        
        // Load explosion sound
        this.loadExplosionSound();
        
        // Start the explosion
        this.explode();
    }
    
    // createParticleTexture() {
    //     // Create a simple circular texture for particles
    //     const texture = new BABYLON.DynamicTexture("explosionTexture", 64, this.scene);
    //     const context = texture.getContext();
        
    //     // Draw a gradient circle
    //     const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    //     gradient.addColorStop(0, "rgba(255, 100, 0, 1)");    // Orange center
    //     gradient.addColorStop(0.5, "rgba(255, 50, 0, 0.8)"); // Red middle
    //     gradient.addColorStop(1, "rgba(255, 0, 0, 0)");      // Transparent edge
        
    //     context.fillStyle = gradient;
    //     context.fillRect(0, 0, 64, 64);
    //     texture.update();
        
    //     this.particleSystem.particleTexture = texture;
    // }
    
    setupParticleSystem() {
        // Particle system
        var particleSystem = new BABYLON.ParticleSystem("explosion", 200, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", this.scene);

        particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
        particleSystem.minEmitBox = new BABYLON.Vector3(0, 0, 0);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0, 0, 0);

        particleSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
        particleSystem.color2 = new BABYLON.Color4(1, 1, 0.2, 1);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);

        particleSystem.minSize = 0.2;
        particleSystem.maxSize = 0.4;

        particleSystem.minLifeTime = 0.05;
        particleSystem.maxLifeTime = 0.2;

        particleSystem.emitRate = 0;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

        particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
        particleSystem.direction1 = new BABYLON.Vector3(-5, 1, -5);
        particleSystem.direction2 = new BABYLON.Vector3(5, -1, 5);

        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;

        particleSystem.minEmitPower = 3;
        particleSystem.maxEmitPower = 6;
        particleSystem.updateSpeed = 0.01;
    }
    
    private loadExplosionSound() {
        // Array of sound URLs to try (with fallbacks)
        const soundUrls = [
            // Your primary Dropbox URL
            "https://dl.dropbox.com/scl/fi/YOUR_FILE_ID/explosion.mp3?rlkey=YOUR_RLKEY&st=YOUR_ST",
            // Fallback public URL
            "https://www.soundjay.com/misc/sounds/explosion_x.wav",
            // Another fallback
            "https://opengameart.org/sites/default/files/explosion.wav"
        ];
        
        this.tryLoadSound(soundUrls, 0);
    }
    
    private tryLoadSound(urls: string[], index: number) {
        if (index >= urls.length) {
            console.warn("All explosion sound URLs failed to load");
            return;
        }
        
        try {
            this.explosionSound = new BABYLON.Sound(
                "explosionSound",
                urls[index],
                this.scene,
                () => {
                    console.log(`✅ Explosion sound loaded from: ${urls[index]}`);
                },
                {
                    volume: 0.5,
                    spatialSound: true,
                    maxDistance: 15,
                    autoplay: false,
                    loop: false
                }
            );
            
            // Check if sound failed to load and try next URL
            this.explosionSound.onEndedObservable.add(() => {
                if (!this.explosionSound?.isReady) {
                    console.warn(`Failed to load sound from: ${urls[index]}, trying next...`);
                    this.tryLoadSound(urls, index + 1);
                }
            });
            
        } catch (error) {
            console.warn(`Error loading sound from ${urls[index]}:`, error);
            this.tryLoadSound(urls, index + 1);
        }
    }
    
    explode() {
        console.log("💥 Explosion created at position:", this.emitter.position);
        
        // Play explosion sound
        if (this.explosionSound) {
            try {
                this.explosionSound.setPosition(this.emitter.position);
                this.explosionSound.play();
            } catch (error) {
                console.warn("Could not play explosion sound:", error);
            }
        }
        
        // Start particle system
        this.particleSystem.start();
        
        // Create a brief flash effect
        this.createFlashEffect();
        
        // Trigger camera shake if available
        if ((window as any).shakeCamera && this.scene.activeCamera) {
            (window as any).shakeCamera(this.scene.activeCamera, 0.05, 200);
        }
        
        // Auto-dispose after explosion duration
        setTimeout(() => {
            this.dispose();
        }, 2000); // 2 seconds
    }
    
    private createFlashEffect() {
        // Create a bright sphere that quickly fades for flash effect
        const flashSphere = BABYLON.MeshBuilder.CreateSphere("flashSphere", {diameter: 0.5}, this.scene);
        flashSphere.position = this.emitter.position.clone();
        
        // Create a bright emissive material
        const flashMaterial = new BABYLON.StandardMaterial("flashMaterial", this.scene);
        flashMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0.8); // Bright white-yellow
        flashMaterial.disableLighting = true;
        flashSphere.material = flashMaterial;
        
        // Animate the flash - scale up quickly then fade out
        const scaleAnimation = BABYLON.Animation.CreateAndStartAnimation(
            "flashScale",
            flashSphere,
            "scaling",
            30,
            15, // 0.5 seconds at 30fps
            new BABYLON.Vector3(0.1, 0.1, 0.1),
            new BABYLON.Vector3(2, 2, 2),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const fadeAnimation = BABYLON.Animation.CreateAndStartAnimation(
            "flashFade",
            flashMaterial,
            "alpha",
            30,
            15, // 0.5 seconds at 30fps
            1.0,
            0.0,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Dispose flash after animation
        setTimeout(() => {
            flashSphere.dispose();
            flashMaterial.dispose();
        }, 500);
    }
    
    dispose() {
        console.log("Disposing explosion particle system");
        
        // Stop and dispose particle system
        if (this.particleSystem) {
            this.particleSystem.stop();
            this.particleSystem.dispose();
        }
        
        // Dispose sound
        if (this.explosionSound) {
            this.explosionSound.dispose();
        }
        
        // Dispose emitter mesh
        if (this.emitter) {
            this.emitter.dispose();
        }
    }
    
    // Static method to create explosion easily
    static createExplosion(position: BABYLON.Vector3, scene: BABYLON.Scene): Explosion {
        return new Explosion(position, scene);
    }
}
