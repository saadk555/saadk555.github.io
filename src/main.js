import './style.css'
import * as THREE from 'three'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import lottie from 'lottie-web'

// --- HOLOGRAPHIC REVEAL ANIMATION LOGIC ---
function initHologramAnimation() {
    const hologramStage = document.getElementById('hologram-stage');
    const avatar = document.getElementById('avatarImg');
    const canvas = document.getElementById('meshCanvas');
    const scanner = document.getElementById('scanner');
    const replayBtn = document.getElementById('replayBtn');
    const loading = document.getElementById('loading');

    let hologramScene, hologramCamera, hologramRenderer;
    let meshGroup, wireframes = [];
    let hiddenCtx;
    let gridCols = 30, gridRows = 50;
    
    function initThree() {
        hologramScene = new THREE.Scene();
        const rect = hologramStage.getBoundingClientRect();
        
        hologramCamera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 1000);
        hologramCamera.position.z = 600;
        
        hologramRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        hologramRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        meshGroup = new THREE.Group();
        hologramScene.add(meshGroup);

        const hiddenCanvas = document.createElement('canvas');
        hiddenCanvas.width = rect.width;
        hiddenCanvas.height = rect.height;
        hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
        
        fitCanvas();
        hologramAnimate();
    }
    
    function fitCanvas() {
        const rect = hologramStage.getBoundingClientRect();
        if (hologramCamera) {
            hologramCamera.aspect = rect.width / rect.height;
            hologramCamera.updateProjectionMatrix();
        }
        if(hologramRenderer) {
            hologramRenderer.setSize(rect.width, rect.height);
        }
    }

    function createBodyMesh() {
        if (!hiddenCtx || !avatar.complete || avatar.naturalHeight === 0) return;

        const rect = hologramStage.getBoundingClientRect();
        
        hiddenCtx.clearRect(0, 0, rect.width, rect.height);
        hiddenCtx.drawImage(avatar, 0, 0, rect.width, rect.height);

        wireframes.forEach(wf => meshGroup.remove(wf));
        wireframes = [];

        const cellW = rect.width / gridCols;
        const cellH = rect.height / gridRows;

        const pointsMap = new Map();
        const validPoints = [];

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const sampleX = Math.floor(c * cellW + cellW / 2);
                const sampleY = Math.floor(r * cellH + cellH / 2);
                
                const pixelData = hiddenCtx.getImageData(sampleX, sampleY, 1, 1).data;
                const alpha = pixelData[3];
                const brightness = (pixelData[0] + pixelData[1] + pixelData[2]) / 3;

                if (alpha > 30) {
                    const x = (c * cellW) - rect.width / 2 + cellW / 2;
                    const y = -(r * cellH) + rect.height / 2 - cellH / 2;
                    const z = (brightness / 255) * 30 - 15;
                    
                    const point = { x, y, z, r, c, brightness };
                    validPoints.push(point);
                    pointsMap.set(`${r}-${c}`, point);
                }
            }
        }

        validPoints.forEach(point => {
            const { r, c } = point;
            if (pointsMap.has(`${r}-${c + 1}`)) createLine(point, pointsMap.get(`${r}-${c + 1}`), r);
            if (pointsMap.has(`${r + 1}-${c}`)) createLine(point, pointsMap.get(`${r + 1}-${c}`), r);
            if (pointsMap.has(`${r + 1}-${c + 1}`)) createLine(point, pointsMap.get(`${r + 1}-${c + 1}`), r);
            if (pointsMap.has(`${r + 1}-${c - 1}`)) createLine(point, pointsMap.get(`${r + 1}-${c - 1}`), r);
        });

        function createLine(p1, p2, row) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]), 3));
            
            const material = new THREE.LineBasicMaterial({ color: 0x00d9ff, transparent: true, opacity: 0, linewidth: 1 });
            
            const line = new THREE.Line(geometry, material);
            line.userData.row = row;
            
            meshGroup.add(line);
            wireframes.push(line);
        }
        
        loading.style.display = 'none';
    }
    
    hologramStage.addEventListener('mousemove', (e) => {
        const rect = hologramStage.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height * 2 - 1);
        
        gsap.to(meshGroup.rotation, { duration: 1.5, x: y * 0.2, y: x * 0.3, ease: 'power2.out' });
    });

    hologramStage.addEventListener('mouseleave', () => {
        gsap.to(meshGroup.rotation, { duration: 1.5, x: 0, y: 0, ease: 'elastic.out(1, 0.5)' });
    });

    function hologramAnimate() {
        requestAnimationFrame(hologramAnimate);
        if (meshGroup) meshGroup.rotation.z += 0.0005;
        if(hologramRenderer && hologramScene && hologramCamera) {
            hologramRenderer.render(hologramScene, hologramCamera);
        }
    }
    
    let masterTimeline;
    function createSequence() {
        if (wireframes.length === 0) return;

        masterTimeline = gsap.timeline({ paused: true });
        
        masterTimeline.fromTo(scanner, { y: -scanner.offsetHeight }, { y: hologramStage.offsetHeight, duration: 3, ease: 'power1.inOut' }, 0);

        wireframes.forEach(wf => {
            const revealTime = (wf.userData.row / gridRows) * 2.5;
            const randomDelay = Math.random() * 0.05;
            masterTimeline.fromTo(wf.material, { opacity: 0 }, { opacity: 0.8, duration: 0.2, ease: 'power2.out' }, revealTime + randomDelay);
        });

        masterTimeline.to(wireframes.map(wf => wf.material), { opacity: 1, duration: 0.2, ease: 'power2.out', stagger: 0.001 }, 2.8);
        masterTimeline.to(avatar, { opacity: 1, duration: 1.5, ease: 'power2.out' }, 3);
        masterTimeline.to(wireframes.map(wf => wf.material), { opacity: 0, duration: 1.2, ease: 'power2.out', stagger: 0.002 }, 3.2);
    }

    function playSequence() {
        if (!masterTimeline) return;
        if (masterTimeline.isActive()) return;
        
        gsap.set(avatar, { opacity: 0 });
        gsap.set(meshGroup.rotation, { x: 0, y: 0, z: 0 });
        wireframes.forEach(wf => { wf.material.opacity = 0; });
        masterTimeline.restart();
    }

    function onImageReady() {
        createBodyMesh();
        createSequence();
        
        // Use intersection observer to start animation only once
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(playSequence, 500);
                    observer.disconnect(); // Play only once on enter
                }
            });
        }, { threshold: 0.5 });
        observer.observe(hologramStage);
    }
    
    initThree();
    
    if (avatar.complete && avatar.naturalHeight !== 0) {
        onImageReady();
    } else {
        avatar.onload = onImageReady;
        avatar.onerror = () => {
            console.error('Failed to load hologram image');
            loading.textContent = 'Failed to load image';
        };
    }
    
    window.addEventListener('resize', () => {
        fitCanvas();
        createBodyMesh();
        createSequence();
    });
    
    if (replayBtn) {
        replayBtn.addEventListener('click', playSequence);
    }
}

// --- MODAL FUNCTIONS ---
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const backdrop = modal.querySelector('.modal-backdrop');
    const content = modal.querySelector('.modal-content');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        if (backdrop) backdrop.style.opacity = '1';
        if (content) {
            content.style.opacity = '1';
            content.style.transform = 'scale(1)';
        }
    }, 10);
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const backdrop = modal.querySelector('.modal-backdrop');
    const content = modal.querySelector('.modal-content');
    
    if (backdrop) backdrop.style.opacity = '0';
    if (content) {
         content.style.opacity = '0';
         content.style.transform = 'scale(0.95)';
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
         document.body.style.overflow = 'auto';
    }, 300);
}

// Initialize everything once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);

    // --- HERO ANIMATION ---
    const nameEl = document.getElementById('name');
    const originalName = 'MUHAMMAD SAAD KHAN';
    nameEl.textContent = '';
    
    gsap.set(['#tagline', '#subheading', '#cta-button'], { opacity: 0, y: 20 });

    let i = 0;
    function typeName() {
        if (i < originalName.length) {
            nameEl.textContent += originalName.charAt(i);
            i++;
            setTimeout(typeName, 150);
        } else {
            nameEl.classList.remove('typing');
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' }});
            tl.to('#tagline', { opacity: 1, y: 0, duration: 1 })
              .to('#subheading', { opacity: 1, y: 0, duration: 1 }, "-=0.7")
              .to('#cta-button', { opacity: 1, y: 0, duration: 1 }, "-=0.7");
        }
    }
    setTimeout(typeName, 500);

    // --- GSAP SCROLL-TRIGGERED ANIMATIONS ---
    const fadeUpElements = document.querySelectorAll('.gsap-fade-up');
    fadeUpElements.forEach((el, index) => {
        gsap.from(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
                toggleActions: 'play none none none',
            },
            opacity: 0,
            y: 50,
            duration: 1,
            ease: 'power3.out',
            delay: (index % 3) * 0.2
        });
    });
    
    // --- SKILLS GLOBE ---
    try {
        TagCanvas.Start('skills-canvas', 'skills-list', {
            textColour: '#00BFFF',
            outlineColour: '#00000000',
            reverse: true,
            depth: 0.8,
            maxSpeed: 0.05,
            imageScale: 1.0,
            initial: [0.05, -0.05],
            wheelZoom: false,
        });
    } catch(e) {
        console.error("TagCanvas failed to start:", e);
        document.getElementById('skills-globe-container').style.display = 'none';
    }

    // --- THREE.JS SCI-FI BACKGROUND ---
    try {
        let scene, camera, renderer, cubesGroup;
        let mouse = new THREE.Vector2();

        function initThreeJS() {
            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 50;

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer.domElement);
            
            cubesGroup = new THREE.Group();

            const cubeGeometry = new THREE.BoxGeometry(3, 3, 3);
            const cubeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });

            for (let i = 0; i < 40; i++) {
                const edges = new THREE.EdgesGeometry(cubeGeometry);
                const line = new THREE.LineSegments(edges, cubeMaterial);
                
                line.position.x = (Math.random() - 0.5) * 150;
                line.position.y = (Math.random() - 0.5) * 150;
                line.position.z = (Math.random() - 0.5) * 150;

                line.rotation.x = Math.random() * Math.PI;
                line.rotation.y = Math.random() * Math.PI;

                cubesGroup.add(line);
            }
            scene.add(cubesGroup);

            window.addEventListener('resize', onWindowResize);
            document.addEventListener('mousemove', onMouseMove);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function onMouseMove(event) {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        }

        function animate() {
            requestAnimationFrame(animate);

            cubesGroup.children.forEach(cube => {
                cube.rotation.x += 0.001;
                cube.rotation.y += 0.001;
            });

            const targetX = mouse.x * 5;
            const targetY = mouse.y * 5;
            cubesGroup.rotation.y += 0.05 * (targetX - cubesGroup.rotation.y);
            cubesGroup.rotation.x += 0.05 * (targetY - cubesGroup.rotation.x);

            renderer.render(scene, camera);
        }

        initThreeJS();
        animate();
    } catch (error) {
        console.error("3D background initialization failed:", error);
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.remove();
        }
    }

    // --- HOLOGRAM ANIMATION ---
    try {
        initHologramAnimation();
    } catch(e) {
        console.error("Hologram animation failed to start:", e);
        document.getElementById('hologram-container').style.display = 'none';
    }
});
