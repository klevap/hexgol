class Game {
    constructor() {
        this.size = Config.DEFAULT_SIZE;
        this.grid = new Grid(this.size);
        this.renderer = new Renderer('board', this.grid);
        
        this.renderer.setColors(Config.DEFAULT_BG_COLOR, Config.DEFAULT_OUTLINE_COLOR);

        // Игровой цикл
        this.rafId = null;
        this.lastTs = 0;
        this.accumulator = 0;
        
        // Скорость: 60 тиков в секунду макс
        this.speed = 1000 / 60; 
        
        this.activeTribe = 0;
        this.generation = 0;

        this.initUI();
        this.setupEvents();
        
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

        document.getElementById('speed-range').oninput = (e) => {
            let val = parseInt(e.target.value);
            // Чем больше значение, тем меньше интервал (быстрее)
            this.speed = 1000 / val;
        };

        document.getElementById('size-select').onchange = (e) => {
            this.resize(parseInt(e.target.value));
        };

        document.getElementById('tribe-select').onchange = (e) => {
            this.activeTribe = parseInt(e.target.value);
        };

        document.getElementById('theme-select').onchange = (e) => {
            this.setTheme(e.target.value);
        };

        document.getElementById('col-bg').oninput = (e) => {
            this.renderer.setColors(e.target.value, this.renderer.colors.outline);
            this.renderer.draw();
            document.querySelector('.main-content').style.backgroundColor = e.target.value;
        };
        document.getElementById('col-outline').oninput = (e) => {
            this.renderer.setColors(this.renderer.colors.bg, e.target.value);
            this.renderer.draw();
        };

        const canvas = document.getElementById('board');
        const handleInput = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

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
        canvas.onmousedown = (e) => { isDrawing = true; handleInput(e); };
        canvas.onmousemove = (e) => { if(isDrawing) handleInput(e); };
        canvas.onmouseup = () => { isDrawing = false; };
        canvas.onmouseleave = () => { isDrawing = false; };
    }

    setTheme(themeName) {
        const root = document.documentElement;
        const bgInput = document.getElementById('col-bg');
        const outlineInput = document.getElementById('col-outline');

        if (themeName === 'dark') {
            root.style.setProperty('--bg-color', '#121212');
            root.style.setProperty('--sidebar-bg', '#1e1e1e');
            root.style.setProperty('--text-color', '#ecf0f1');
            root.style.setProperty('--input-bg', '#2c2c2c');
            root.style.setProperty('--border-color', '#333');
            
            this.renderer.setColors('#000000', '#333333');
            document.querySelector('.main-content').style.backgroundColor = '#000000';
            
            bgInput.value = '#000000';
            outlineInput.value = '#333333';
        } 
        else if (themeName === 'light') {
            root.style.setProperty('--bg-color', '#f0f2f5');
            root.style.setProperty('--sidebar-bg', '#ffffff');
            root.style.setProperty('--text-color', '#2c3e50');
            root.style.setProperty('--input-bg', '#ffffff');
            root.style.setProperty('--border-color', '#bdc3c7');

            this.renderer.setColors('#ffffff', '#000000');
            document.querySelector('.main-content').style.backgroundColor = '#d7f7f1';

            bgInput.value = '#ffffff';
            outlineInput.value = '#000000';
        }
        else if (themeName === 'neon') {
            root.style.setProperty('--bg-color', '#000000');
            root.style.setProperty('--sidebar-bg', '#0a0a0a');
            root.style.setProperty('--text-color', '#00ff00');
            root.style.setProperty('--input-bg', '#111');
            root.style.setProperty('--border-color', '#00ff00');

            this.renderer.setColors('#000000', '#00ff00');
            document.querySelector('.main-content').style.backgroundColor = '#000000';

            bgInput.value = '#000000';
            outlineInput.value = '#00ff00';
        }
        this.renderer.draw();
    }

    // --- Game Control (Optimized Loop) ---

    play() {
        if (this.rafId) return;
        
        document.getElementById('btn-play').classList.add('hidden');
        document.getElementById('btn-pause').classList.remove('hidden');

        this.lastTs = performance.now();
        this.accumulator = 0;

        const loop = (ts) => {
            const dt = ts - this.lastTs;
            this.lastTs = ts;
            this.accumulator += dt;

            // Защита от "спирали смерти" (если вкладка была неактивна долго)
            if (this.accumulator > 1000) this.accumulator = 1000;

            let updated = false;
            
            // Выполняем шаги симуляции, пока накопилось время
            while (this.accumulator >= this.speed) {
                this.grid.update();
                this.generation++;
                this.accumulator -= this.speed;
                updated = true;
            }

            if (updated) {
                document.getElementById('stats-display').innerText = `Generation: ${this.generation}`;
                this.renderer.draw();
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
        document.getElementById('stats-display').innerText = `Generation: ${this.generation}`;
        this.renderer.draw();
    }

    clear() {
        this.pause();
        this.grid.clear();
        this.generation = 0;
        this.renderer.draw();
    }

    resize(newSize) {
        this.pause();
        this.size = newSize;
        this.grid = new Grid(this.size);
        
        // Обновляем ссылку на grid в рендерере и пересчитываем всё
        this.renderer.grid = this.grid;
        this.renderer.resize();
        
        this.randomize(); 
    }

    // --- Generators Wrappers ---
    
    randomize() {
        this.grid.clear();
        for (let row of this.grid.cells) {
            for (let cell of row) {
                if (cell.isValid && Math.random() < 0.3) {
                    cell.isAlive = 1;
                    cell.tribe = Math.random() > 0.5 ? 0 : 1;
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
    generatePurpleSym3() { this.grid.randomizePurpleSym3(); this.renderer.draw(); }
}

const game = new Game();