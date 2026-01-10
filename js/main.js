class Game {
    constructor() {
        this.size = Config.DEFAULT_SIZE;
        this.grid = new Grid(this.size);
        this.renderer = new Renderer('grid-layer', 'cells-layer', this.grid);
        
        this.renderer.setColors(Config.DEFAULT_BG_COLOR, Config.DEFAULT_OUTLINE_COLOR);

        this.rafId = null;
        this.lastTs = 0;
        this.accumulator = 0;
        this.speed = 1000 / 60; 
        
        this.activeTribe = 0;
        this.generation = 0;

        this.frameCount = 0;
        this.tickCount = 0;
        this.lastStatTime = 0;

        this.initUI();
        this.setupEvents();
        
        // Инициализация цветов генерации по умолчанию (Red & Blue)
        this.updateGenerationColors('rb');
        this.generateSym62();
    }

    initUI() {
        const tribeSelect = document.getElementById('tribe-select');
        for (let id in Config.TRIBES) {
            let opt = document.createElement('option');
            opt.value = id;
            opt.innerText = Config.TRIBES[id].name;
            tribeSelect.appendChild(opt);
        }
    }

    setupEvents() {
        document.getElementById('btn-play').onclick = () => this.play();
        document.getElementById('btn-pause').onclick = () => this.pause();
        document.getElementById('btn-next').onclick = () => this.step();
        document.getElementById('btn-clear').onclick = () => this.clear();
        document.getElementById('btn-screenshot').onclick = () => this.takeScreenshot();

        document.getElementById('speed-range').oninput = (e) => {
            let val = parseInt(e.target.value);
            this.speed = 1000 / val;
        };

        document.getElementById('size-select').onchange = (e) => {
            this.resizeGrid(parseInt(e.target.value));
        };

        document.getElementById('tribe-select').onchange = (e) => {
            this.activeTribe = parseInt(e.target.value);
        };

        document.getElementById('gen-colors-select').onchange = (e) => {
            this.updateGenerationColors(e.target.value);
        };

        document.getElementById('theme-select').onchange = (e) => {
            this.setTheme(e.target.value);
        };

        // --- Управление цветами и чекбоксами ---
        const updateColors = () => {
            const bg = document.getElementById('col-bg').value;
            const outline = document.getElementById('col-outline').value;
            const showBg = document.getElementById('chk-bg').checked;
            const showOutline = document.getElementById('chk-outline').checked;

            // Обновляем рендерер (он сам решит, рисовать прозрачность или цвет)
            this.renderer.setColors(bg, outline);
            this.renderer.setVisibility(showBg, showOutline);

            // Обновляем CSS контейнера для визуального комфорта в приложении
            const mainContent = document.querySelector('.main-content');
            if (showBg) {
                mainContent.style.backgroundColor = bg;
            } else {
                // Если фон выключен (прозрачный), делаем контейнер серым
                mainContent.style.backgroundColor = '#2c2c2c'; 
            }
        };

        document.getElementById('col-bg').oninput = updateColors;
        document.getElementById('col-outline').oninput = updateColors;
        document.getElementById('chk-bg').onchange = updateColors;
        document.getElementById('chk-outline').onchange = updateColors;

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.rafId) this.pause(); else this.play();
            }
            else if (e.code === 'Enter') {
                if (!this.rafId) this.step();
            }
        });

        // --- ВЗАИМОДЕЙСТВИЕ С КАНВАСОМ ---
        const canvas = document.getElementById('cells-layer');
        
        const handleInput = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const x = (clientX - rect.left) * (canvas.width / rect.width);
            const y = (clientY - rect.top) * (canvas.height / rect.height);

            const coords = this.renderer.getGridCoordinate(x, y);
            const cell = this.grid.getCell(coords.row, coords.col);

            if (cell && cell.isValid) {
                cell.isAlive = 1;
                cell.tribe = this.activeTribe;
                cell.age = 5; 
                this.renderer.draw();
            }
        };

        let isDrawing = false;
        canvas.onmousedown = (e) => { isDrawing = true; handleInput(e.clientX, e.clientY); };
        canvas.onmousemove = (e) => { if(isDrawing) handleInput(e.clientX, e.clientY); };
        canvas.onmouseup = () => { isDrawing = false; };
        canvas.onmouseleave = () => { isDrawing = false; };

        canvas.addEventListener('touchstart', (e) => {
            if(e.cancelable) e.preventDefault(); 
            isDrawing = true;
            handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if(e.cancelable) e.preventDefault();
            if(isDrawing) handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        canvas.addEventListener('touchend', () => { isDrawing = false; });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.renderer.resize();
            }, 100);
        });
    }

    updateGenerationColors(val) {
        // 0: Blue, 1: Red, 2: Green (Excluded), 3: Purple
        let tribes = [];
        switch(val) {
            case 'rb': tribes = [1, 0]; break; // Red & Blue
            case 'rp': tribes = [1, 3]; break; // Red & Purple
            case 'bp': tribes = [0, 3]; break; // Blue & Purple
            case 'rbp': tribes = [1, 0, 3]; break; // Red & Blue & Purple
            default: tribes = [1, 0];
        }
        this.grid.setGenerationTribes(tribes);
    }

    takeScreenshot() {
        // Создаем временный канвас для объединения слоев
        const canvas = document.createElement('canvas');
        const w = this.renderer.gridCanvas.width;
        const h = this.renderer.gridCanvas.height;
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // 1. Рисуем слой сетки/фона
        // Если галочка фона снята, gridCanvas прозрачный, и скриншот будет прозрачным
        ctx.drawImage(this.renderer.gridCanvas, 0, 0);

        // 2. Рисуем клетки
        ctx.drawImage(this.renderer.cellsCanvas, 0, 0);

        // 3. Скачиваем
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `hex-life-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    setTheme(themeName) {
        const root = document.documentElement;
        const bgInput = document.getElementById('col-bg');
        const outlineInput = document.getElementById('col-outline');
        const chkBg = document.getElementById('chk-bg');
        const chkOutline = document.getElementById('chk-outline');

        // При смене темы включаем галочки обратно
        chkBg.checked = true;
        chkOutline.checked = true;

        if (themeName === 'dark') {
            root.style.setProperty('--bg-color', '#121212');
            root.style.setProperty('--sidebar-bg', '#1e1e1e');
            root.style.setProperty('--text-color', '#ecf0f1');
            root.style.setProperty('--input-bg', '#2c2c2c');
            root.style.setProperty('--border-color', '#333');
            
            bgInput.value = '#000000';
            outlineInput.value = '#333333';
        } 
        else if (themeName === 'light') {
            root.style.setProperty('--bg-color', '#f0f2f5');
            root.style.setProperty('--sidebar-bg', '#ffffff');
            root.style.setProperty('--text-color', '#2c3e50');
            root.style.setProperty('--input-bg', '#ffffff');
            root.style.setProperty('--border-color', '#bdc3c7');

            bgInput.value = '#ffffff';
            outlineInput.value = '#000000';
        }
        else if (themeName === 'neon') {
            root.style.setProperty('--bg-color', '#000000');
            root.style.setProperty('--sidebar-bg', '#0a0a0a');
            root.style.setProperty('--text-color', '#00ff00');
            root.style.setProperty('--input-bg', '#111');
            root.style.setProperty('--border-color', '#00ff00');

            bgInput.value = '#000000';
            outlineInput.value = '#00ff00';
        }

        // Принудительно вызываем обновление цветов и видимости
        bgInput.dispatchEvent(new Event('input'));
    }

    play() {
        if (this.rafId) return;
        document.getElementById('btn-play').classList.add('hidden');
        document.getElementById('btn-pause').classList.remove('hidden');
        
        this.lastTs = performance.now();
        this.lastStatTime = this.lastTs;
        this.accumulator = 0;
        this.frameCount = 0;
        this.tickCount = 0;

        const loop = (ts) => {
            const dt = ts - this.lastTs;
            this.lastTs = ts;
            this.accumulator += dt;
            
            if (this.accumulator > 1000) this.accumulator = 1000;
            
            let updated = false;
            while (this.accumulator >= this.speed) {
                this.grid.update();
                this.generation++;
                this.tickCount++;
                this.accumulator -= this.speed;
                updated = true;
            }
            
            if (updated) {
                document.getElementById('stats-gen').innerText = `Generation: ${this.generation}`;
                this.renderer.draw();
                this.frameCount++;
            }

            if (ts - this.lastStatTime >= 1000) {
                document.getElementById('stats-perf').innerText = `FPS: ${this.frameCount} | TPS: ${this.tickCount}`;
                this.frameCount = 0;
                this.tickCount = 0;
                this.lastStatTime = ts;
            }

            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    pause() {
        if (!this.rafId) return;
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
        document.getElementById('btn-play').classList.remove('hidden');
        document.getElementById('btn-pause').classList.add('hidden');
    }

    step() {
        this.grid.update();
        this.generation++;
        document.getElementById('stats-gen').innerText = `Generation: ${this.generation}`;
        this.renderer.draw();
    }

    clear() {
        this.pause();
        this.grid.clear();
        this.generation = 0;
        document.getElementById('stats-gen').innerText = `Generation: 0`;
        this.renderer.draw();
    }

    resizeGrid(newSize) {
        this.pause();
        this.size = newSize;
        this.grid = new Grid(this.size);
        
        // При ресайзе восстанавливаем выбранные цвета
        const colorVal = document.getElementById('gen-colors-select').value;
        this.updateGenerationColors(colorVal);

        this.renderer.grid = this.grid;
        this.renderer.resize(); 
        
        this.randomize(); 
    }

    randomize() {
        this.grid.clear();
        for (let row of this.grid.cells) {
            for (let cell of row) {
                if (cell.isValid && Math.random() < 0.3) {
                    cell.isAlive = 1;
                    // Случайный выбор из разрешенных племен
                    const randIdx = Math.floor(Math.random() * this.grid.generationTribes.length);
                    cell.tribe = this.grid.generationTribes[randIdx];
                    cell.age = Math.floor(Math.random() * 20);
                }
            }
        }
        this.renderer.draw();
    }

    generateSym2() { this.grid.randomizeSym2(); this.renderer.draw(); }
    generateSym3() { this.grid.randomizeSym3(); this.renderer.draw(); }
    generateSym4() { this.grid.randomizeSym4(); this.renderer.draw(); }
    generateSym6() { this.grid.randomizeSym6(); this.renderer.draw(); }
    generateSym32() { this.grid.randomizeSym32(); this.renderer.draw(); }
    generateSym62() { this.grid.randomizeSym62(); this.renderer.draw(); }
}

const game = new Game();