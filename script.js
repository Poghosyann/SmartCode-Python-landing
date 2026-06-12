(function () {
    'use strict';

    const LIB_TIMEOUT_MS = 4000;

    function hasGsap() {
        return typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    }

    function hasLenis() {
        return typeof Lenis !== 'undefined';
    }

    function hasLucide() {
        return typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function';
    }

    function hasThree() {
        return typeof THREE !== 'undefined';
    }

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function markFallback(...flags) {
        flags.forEach((flag) => document.body.classList.add(flag));
    }

    function revealAnimatedContent() {
        markFallback('fallback-animations');
    }

    function initIcons() {
        if (!hasLucide()) {
            markFallback('no-lucide');
            return;
        }

        try {
            lucide.createIcons();
        } catch (error) {
            console.warn('[SCA] Lucide init failed:', error);
            markFallback('no-lucide');
        }
    }

    function initAnalytics() {
        const config = window.SCA_CONFIG?.analytics;
        if (!config) return;

        const { ga4MeasurementId, metaPixelId } = config;
        const hasGa4 = Boolean(ga4MeasurementId);
        const hasMeta = Boolean(metaPixelId);

        if (!hasGa4 && !hasMeta) return;

        window.SCA_TRACK = function track(eventName, params = {}) {
            if (hasGa4 && typeof gtag === 'function') {
                gtag('event', eventName, params);
            }
            if (hasMeta && typeof fbq === 'function') {
                if (eventName === 'generate_lead') {
                    fbq('track', 'Lead', params);
                } else {
                    fbq('trackCustom', eventName, params);
                }
            }
        };

        if (hasGa4) {
            const gaScript = document.createElement('script');
            gaScript.async = true;
            gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId)}`;
            gaScript.onerror = () => console.warn('[SCA] Google Analytics script failed to load');
            document.head.appendChild(gaScript);

            window.dataLayer = window.dataLayer || [];
            window.gtag = function gtag() {
                window.dataLayer.push(arguments);
            };
            gtag('js', new Date());
            gtag('config', ga4MeasurementId, { anonymize_ip: true });
        }

        if (hasMeta) {
            !(function (f, b, e, v, n, t, s) {
                if (f.fbq) return;
                n = f.fbq = function () {
                    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                };
                if (!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = true;
                n.version = '2.0';
                n.queue = [];
                t = b.createElement(e);
                t.async = true;
                t.src = v;
                t.onerror = () => console.warn('[SCA] Meta Pixel script failed to load');
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s);
            })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', metaPixelId);
            fbq('track', 'PageView');
        }
    }

    function trackCtaClicks() {
        if (typeof window.SCA_TRACK !== 'function') return;

        document.querySelectorAll('a[href="#registration"]').forEach((link) => {
            link.addEventListener('click', () => {
                window.SCA_TRACK('cta_click', {
                    event_category: 'engagement',
                    event_label: 'registration_cta',
                    link_text: link.textContent.trim(),
                });
            });
        });
    }

    function trackFormSubmission(form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();

            if (typeof window.SCA_TRACK === 'function') {
                window.SCA_TRACK('generate_lead', {
                    event_category: 'form',
                    event_label: 'application_form',
                });
            }

            const submitBtn = form.querySelector('[type="submit"]');
            const originalText = submitBtn?.textContent;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Ուղարկվում է...';
            }

            window.setTimeout(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
                alert('Շնորհակալություն։ Ձեր հայտը ստացվել է։ Մենք շուտով կկապվենք Ձեզ հետ։');
                form.reset();
            }, 600);
        });
    }

    function initHeaderScroll() {
        const header = document.getElementById('header');
        if (!header) return;

        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });
    }

    function initAnchorScroll(lenis) {
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', (event) => {
                const targetId = anchor.getAttribute('href');
                if (!targetId || targetId === '#') return;

                const targetElement = document.querySelector(targetId);
                if (!targetElement) return;

                event.preventDefault();

                if (lenis) {
                    lenis.scrollTo(targetElement, { offset: -80 });
                    return;
                }

                const top = targetElement.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top, behavior: 'smooth' });
            });
        });
    }

    function initLenis() {
        if (prefersReducedMotion() || !hasLenis()) {
            if (!hasLenis()) markFallback('no-lenis');
            return null;
        }

        try {
            const lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                direction: 'vertical',
                gestureDirection: 'vertical',
                smooth: true,
                mouseMultiplier: 1,
                smoothTouch: false,
                touchMultiplier: 2,
                infinite: false,
            });

            if (hasGsap()) {
                lenis.on('scroll', ScrollTrigger.update);
                gsap.ticker.add((time) => {
                    lenis.raf(time * 1000);
                });
                gsap.ticker.lagSmoothing(0);
            } else {
                function raf(time) {
                    lenis.raf(time);
                    requestAnimationFrame(raf);
                }
                requestAnimationFrame(raf);
            }

            return lenis;
        } catch (error) {
            console.warn('[SCA] Lenis init failed:', error);
            markFallback('no-lenis');
            return null;
        }
    }

    function initGsapAnimations() {
        if (prefersReducedMotion() || !hasGsap()) {
            if (!hasGsap()) markFallback('no-gsap');
            revealAnimatedContent();
            return;
        }

        try {
            gsap.registerPlugin(ScrollTrigger);

            document.querySelectorAll('.gsap-fade-up').forEach((element) => {
                gsap.to(element, {
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                    },
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                });
            });

            gsap.to('.hero-bg-pattern', {
                yPercent: 30,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: true,
                },
            });

            document.body.classList.add('animations-ready');
        } catch (error) {
            console.warn('[SCA] GSAP init failed:', error);
            markFallback('no-gsap', 'fallback-animations');
        }
    }

    function initFaqAccordion() {
        document.querySelectorAll('.accordion-header').forEach((header) => {
            header.addEventListener('click', () => {
                const isActive = header.classList.contains('active');
                const content = header.nextElementSibling;

                document.querySelectorAll('.accordion-header').forEach((item) => {
                    item.classList.remove('active');
                    if (item.nextElementSibling) {
                        item.nextElementSibling.style.maxHeight = null;
                    }
                });

                if (!isActive && content) {
                    header.classList.add('active');
                    content.style.maxHeight = `${content.scrollHeight}px`;
                }
            });
        });
    }

    function initHeroCanvas() {
        const canvas = document.getElementById('hero-canvas');
        if (!canvas) return;

        if (prefersReducedMotion() || !hasThree()) {
            markFallback('no-threejs');
            return;
        }

        let animationId = null;
        let disposed = false;

        try {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 30;

            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const innerGeometry = new THREE.IcosahedronGeometry(12, 8);
            const innerMaterial = new THREE.PointsMaterial({
                size: 0.06,
                color: 0xF59E0B,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
            });

            const outerGeometry = new THREE.IcosahedronGeometry(14, 5);
            const outerMaterial = new THREE.PointsMaterial({
                size: 0.08,
                color: 0x4B5563,
                transparent: true,
                opacity: 0.5,
            });

            const particleGroup = new THREE.Group();
            particleGroup.add(new THREE.Points(innerGeometry, innerMaterial));
            particleGroup.add(new THREE.Points(outerGeometry, outerMaterial));
            particleGroup.position.x = 15;
            scene.add(particleGroup);

            let mouseX = 0;
            let mouseY = 0;
            let currentMouseX = 0;
            let currentMouseY = 0;

            const onMouseMove = (event) => {
                mouseX = event.clientX - window.innerWidth / 2;
                mouseY = event.clientY - window.innerHeight / 2;
            };

            const clock = new THREE.Clock();

            const tick = () => {
                if (disposed) return;

                const elapsedTime = clock.getElapsedTime();
                currentMouseX += (mouseX - currentMouseX) * 0.05;
                currentMouseY += (mouseY - currentMouseY) * 0.05;

                particleGroup.rotation.y = elapsedTime * 0.1 + currentMouseX * 0.002;
                particleGroup.rotation.x = elapsedTime * 0.05 + currentMouseY * 0.002;

                renderer.render(scene, camera);
                animationId = requestAnimationFrame(tick);
            };

            const onResize = () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            };

            const onVisibilityChange = () => {
                if (document.hidden) {
                    if (animationId) cancelAnimationFrame(animationId);
                    animationId = null;
                    return;
                }

                if (!animationId) tick();
            };

            document.addEventListener('mousemove', onMouseMove, { passive: true });
            window.addEventListener('resize', onResize);
            document.addEventListener('visibilitychange', onVisibilityChange);
            tick();

            window.addEventListener('pagehide', () => {
                disposed = true;
                if (animationId) cancelAnimationFrame(animationId);
                document.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('resize', onResize);
                document.removeEventListener('visibilitychange', onVisibilityChange);
                renderer.dispose();
                innerGeometry.dispose();
                outerGeometry.dispose();
                innerMaterial.dispose();
                outerMaterial.dispose();
            }, { once: true });
        } catch (error) {
            console.warn('[SCA] Three.js init failed:', error);
            markFallback('no-threejs');
        }
    }

    function waitForLibraries() {
        return new Promise((resolve) => {
            const start = Date.now();

            const check = () => {
                const libsReady = hasLucide() && hasLenis() && hasGsap() && hasThree();
                const timedOut = Date.now() - start >= LIB_TIMEOUT_MS;

                if (libsReady || timedOut) {
                    if (timedOut && !libsReady) {
                        console.warn('[SCA] Library load timeout — using fallbacks');
                    }
                    resolve();
                    return;
                }

                requestAnimationFrame(check);
            };

            check();
        });
    }

    function initInstructorsSlider() {
        const grid = document.querySelector('.instructors-grid');
        const prevBtn = document.querySelector('.prev-arrow');
        const nextBtn = document.querySelector('.next-arrow');
        if (!grid || !prevBtn || !nextBtn) return;

        let currentIndex = 0;

        function updateSlider() {
            const cards = document.querySelectorAll('.instructor-card');
            if (cards.length === 0) return;
            const cardWidth = cards[0].offsetWidth;
            
            let gap = parseFloat(window.getComputedStyle(grid).gap);
            if (isNaN(gap)) {
                gap = 32; // fallback to 2rem
            }
            
            const cardsPerView = window.innerWidth <= 768 ? 1 : 2;
            const maxIndex = Math.max(0, cards.length - cardsPerView);
            
            if (currentIndex > maxIndex) currentIndex = maxIndex;
            if (currentIndex < 0) currentIndex = 0;

            const translateX = currentIndex * (cardWidth + gap);
            grid.style.transform = `translateX(-${translateX}px)`;
            
            if (currentIndex === 0) {
                prevBtn.style.opacity = '0';
                prevBtn.style.pointerEvents = 'none';
            } else {
                prevBtn.style.opacity = '1';
                prevBtn.style.pointerEvents = 'auto';
            }
            
            if (currentIndex === maxIndex) {
                nextBtn.style.opacity = '0';
                nextBtn.style.pointerEvents = 'none';
            } else {
                nextBtn.style.opacity = '1';
                nextBtn.style.pointerEvents = 'auto';
            }
        }

        prevBtn.addEventListener('click', () => {
            currentIndex--;
            updateSlider();
        });

        nextBtn.addEventListener('click', () => {
            currentIndex++;
            updateSlider();
        });

        window.addEventListener('resize', updateSlider);
        
        // Initial setup
        setTimeout(updateSlider, 100);
    }

    function bootstrap() {
        initAnalytics();
        initIcons();
        initHeaderScroll();

        const lenis = initLenis();
        initAnchorScroll(lenis);
        initGsapAnimations();
        initFaqAccordion();
        initHeroCanvas();
        trackCtaClicks();
        initInstructorsSlider();

        const form = document.querySelector('.apply-form');
        if (form) trackFormSubmission(form);

        window.setTimeout(() => {
            if (!document.body.classList.contains('animations-ready')) {
                revealAnimatedContent();
            }
        }, LIB_TIMEOUT_MS + 500);
    }

    document.addEventListener('DOMContentLoaded', () => {
        waitForLibraries().then(bootstrap);
    });
})();
