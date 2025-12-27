(function () {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d', { alpha: false });
      const reloadBtn = document.getElementById('reload');
      const fileInput = document.getElementById('file');
      const useLocalBtn = document.getElementById('useLocal');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      let img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = 'scrollingText.jpg'; // default
      let particles = [];
      const STEP = 4;            // sampling step (smaller = more particles)
      const SIZE = 3;            // particle draw size
      let w = canvas.width, h = canvas.height;

      // mouse/touch
      let mx = -9999, my = -9999, isPointerDown = false;

      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        mx = (e.clientX - r.left) * (canvas.width / r.width);
        my = (e.clientY - r.top) * (canvas.height / r.height);
      });
      canvas.addEventListener('mouseleave', () => { mx = -9999; my = -9999; isPointerDown = false; });
      canvas.addEventListener('mousedown', () => isPointerDown = true);
      canvas.addEventListener('mouseup', () => isPointerDown = false);

      // touch support
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const r = canvas.getBoundingClientRect();
        mx = (t.clientX - r.left) * (canvas.width / r.width);
        my = (t.clientY - r.top) * (canvas.height / r.height);
        isPointerDown = true;
      }, { passive: false });
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const r = canvas.getBoundingClientRect();
        mx = (t.clientX - r.left) * (canvas.width / r.width);
        my = (t.clientY - r.top) * (canvas.height / r.height);
      }, { passive: false });
      canvas.addEventListener('touchend', () => { isPointerDown = false; mx = -9999; my = -9999; });

      // Build particles from image pixels
      function buildParticlesFromImage(img) {
        // draw image to temp canvas scaled to fit main canvas while keeping aspect
        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const tctx = tmp.getContext('2d');
        // fill black background for consistent alpha checks
        tctx.fillStyle = '#e6edf3';
        tctx.fillRect(0, 0, w, h);
        // draw image to cover canvas area (center-crop)
        const arImg = w / h;
        const arCanvas = w / h;
        let dw = w, dh = h, dx = 0, dy = 0;

        tctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgd = tctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgd.data;
        particles = [];
        for (let y = 0; y < h; y += STEP) {
          for (let x = 0; x < w; x += STEP) {
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            if (a > 40) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
              // initialize particle at its original pixel (so image looks whole)
              particles.push({
                x: x, y: y,         // current pos
                x0: x, y0: y,       // origin/target pos
                vx: 0, vy: 0,
                color: `rgb(${r},${g},${b})`,
                off: false          // whether currently displaced
              });
            }
          }
        }
      }

      // physics parameters
      const REPEL_RADIUS = 50;
      const REPEL_FORCE = 3.5;
      const RETURN_FORCE = 0.06;
      const DAMPING = 0.85;
      const MAX_SPEED = 25;

      function step() {
        ctx.clearRect(0, 0, w, h);
        for (let p of particles) {
          // distance to pointer
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.hypot(dx, dy) - 0.0001;

          if (dist < REPEL_RADIUS && (mx !== -9999 && my !== -9999)) {
            // repel away from pointer (stronger when pointer pressed)
            const f = (1 - dist / REPEL_RADIUS);
            const push = REPEL_FORCE * (isPointerDown ? 1.6 : 1.0);
            p.vx += (dx / dist) * f * push;
            p.vy += (dy / dist) * f * push;
            p.off = true;
          } else if (p.off) {
            // return to origin smoothly using spring-like force
            const tx = p.x0 - p.x;
            const ty = p.y0 - p.y;
            p.vx += tx * RETURN_FORCE;
            p.vy += ty * RETURN_FORCE;

            // if very close, snap and mark settled
            if (Math.abs(tx) < 0.3 && Math.abs(ty) < 0.3 && Math.hypot(p.vx, p.vy) < 0.3) {
              p.x = p.x0; p.y = p.y0; p.vx = 0; p.vy = 0; p.off = false;
            }
          }

          // velocity clamp + damping
          p.vx *= DAMPING; p.vy *= DAMPING;
          const spd = Math.hypot(p.vx, p.vy);
          if (spd > MAX_SPEED) {
            p.vx = (p.vx / spd) * MAX_SPEED;
            p.vy = (p.vy / spd) * MAX_SPEED;
          }

          // integrate
          p.x += p.vx;
          p.y += p.vy;

          // draw particle
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), SIZE, SIZE);
        }
        requestAnimationFrame(step);
      }

      // initial load
      img.onload = function () {
        // if image smaller than canvas, prefer canvas size equals image size
        // keep canvas at default sized set in DOM, but we scale image to canvas
        buildParticlesFromImage(img);
        step();
      };

      // adapt canvas resolution on window resize (rebuild particles)
      window.addEventListener('resize', () => {
        // keep canvas element size as defined; if you want responsive resize, uncomment below:

        w = canvas.width; h = canvas.height;
        if (img.complete) buildParticlesFromImage(img);
      });

    })();