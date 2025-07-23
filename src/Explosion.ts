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
        this.createParticleTexture();
        
        // Configure particle system
        this.setupParticleSystem();
        
        // Load explosion sound
        this.loadExplosionSound();
        
        // Start the explosion
        this.explode();
    }
    
    createParticleTexture() {
        // Create a simple circular texture for particles
        const texture = new BABYLON.DynamicTexture("explosionTexture", 64, this.scene);
        const context = texture.getContext();
        
        // Draw a gradient circle
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255, 100, 0, 1)");    // Orange center
        gradient.addColorStop(0.5, "rgba(255, 50, 0, 0.8)"); // Red middle
        gradient.addColorStop(1, "rgba(255, 0, 0, 0)");      // Transparent edge
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        texture.update();
        
        this.particleSystem.particleTexture = texture;
    }
    
    setupParticleSystem() {
        // Particle emission
        this.particleSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
        this.particleSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);
        
        // Colors - bright explosion colors
        this.particleSystem.color1 = new BABYLON.Color4(1, 0.8, 0, 1.0);  // Bright orange
        this.particleSystem.color2 = new BABYLON.Color4(1, 0.2, 0, 1.0);  // Bright red
        this.particleSystem.colorDead = new BABYLON.Color4(0.3, 0.3, 0.3, 0.0); // Dark gray and transparent
        
        // Size - make particles more visible
        this.particleSystem.minSize = 0.1;
        this.particleSystem.maxSize = 0.4;
        
        // Life time
        this.particleSystem.minLifeTime = 0.5;
        this.particleSystem.maxLifeTime = 1.2;
        
        // Emission rate - burst effect
        this.particleSystem.emitRate = 300;
        
        // Blend mode for bright effect
        this.particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        // Gravity and direction for realistic explosion
        this.particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
        this.particleSystem.direction1 = new BABYLON.Vector3(-3, 1, -3);
        this.particleSystem.direction2 = new BABYLON.Vector3(3, 6, 3);
        
        // Speed for explosive effect
        this.particleSystem.minEmitPower = 3;
        this.particleSystem.maxEmitPower = 8;
        this.particleSystem.updateSpeed = 0.005; // Faster updates for smoother animation
        
        // Angular velocity for spinning particles
        this.particleSystem.minAngularSpeed = -Math.PI;
        this.particleSystem.maxAngularSpeed = Math.PI;
        
        // Create spherical emission for 360-degree explosion
        this.particleSystem.createSphereEmitter(0.3);
        
        // Add size animation over lifetime
        this.particleSystem.addSizeGradient(0, 0.2);    // Start small
        this.particleSystem.addSizeGradient(0.3, 1.0);  // Grow to full size
        this.particleSystem.addSizeGradient(1.0, 0.1);  // Shrink at end
        
        // Add color animation over lifetime
        this.particleSystem.addColorGradient(0, new BABYLON.Color4(1, 1, 0.5, 1));    // Bright yellow start
        this.particleSystem.addColorGradient(0.4, new BABYLON.Color4(1, 0.5, 0, 1));  // Orange middle
        this.particleSystem.addColorGradient(1.0, new BABYLON.Color4(0.5, 0, 0, 0));  // Dark red end (transparent)
    }
    
    private loadExplosionSound() {
        try {
            // Use a synthetic explosion sound effect (data URL)
            // This creates a short burst of noise that sounds like an explosion
            this.explosionSound = new BABYLON.Sound(
                "explosionSound",
                "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIZCixs1O/FdicBGHLh9tmSOAcYYLTp66hVEQpGn+DyvGIZCixs1O/FdicBGHLh9tmSOAcYYLTp66hVEQpGn+DyvGIZCixs1O/FdicBGHLh9tmSOAcYYLTp66hVEQpGn+DyvGIZCi", 
                this.scene,
                null,
                {
                    volume: 0.3,
                    spatialSound: true,
                    maxDistance: 10
                }
            );
        } catch (error) {
            console.warn("Could not load explosion sound:", error);
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
