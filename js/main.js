class Game {
    constructor() {
        this.size = Config.DEFAULT_SIZE;
        this.grid = new Grid(this.size);
        this.renderer = new Renderer('board', this.grid);
        
        this.renderer.setColors(Config.DEFAULT_BG_COLOR, Config.DEFAULT_OUTLINE_COLOR);

        this.rafId = null;
        this.lastTs = 0;
        this.accumulator = 0;
        this.speed = 1000 / 60; 
        
        this.activeTribe = 0;
        this.generation = 0;

        this.initUI();
        this.setupEvents();
        
        // Генерируем начальное состояние
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
        // Кнопки UI
        document.getElementById('btn-play').onclick = () => this.play();
        document.getElementById('btn-pause').onclick = () => this.pause();
        document.getElementById('btn-next').onclick = () => this.step();
        document.getElementById('btn-clear').onclick = () => this.clear();

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

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.rafId) this.pause(); else this.play();
            }
            else if (e.code === 'Enter') {
                if (!this.rafId) this.step();
            }
        });

        // --- ВЗАИМОДЕЙСТВИЕ С КАНВАСОМ (МЫШЬ + TOUCH) ---
        const canvas = document.getElementById('board');
        
        // Общая функция обработки ввода
        const handleInput = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            // Учитываем масштаб канваса (хотя теперь он 1:1, но на всякий случай)
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

        // Мышь
        let isDrawing = false;
        canvas.onmousedown = (e) => { isDrawing = true; handleInput(e.clientX, e.clientY); };
        canvas.onmousemove = (e) => { if(isDrawing) handleInput(e.clientX, e.clientY); };
        canvas.onmouseup = () => { isDrawing = false; };
        canvas.onmouseleave = () => { isDrawing = false; };

        // --- TOUCH EVENTS (Для мобильных) ---
        canvas.addEventListener('touchstart', (e) => {
            // Предотвращаем скролл страницы при касании канваса
            if(e.cancelable) e.preventDefault(); 
            isDrawing = true;
            handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if(e.cancelable) e.preventDefault();
            if(isDrawing) handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        canvas.addEventListener('touchend', () => { isDrawing = false; });

        // --- РЕСАЙЗ ОКНА ---
        // Если пользователь повернул телефон или изменил размер окна
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Пересчитываем только визуальную часть, не сбрасывая игру
                this.renderer.resize();
            }, 100);
        });
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
            if (this.accumulator > 1000) this.accumulator = 1000;
            let updated = false;
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

    // Переименовал метод, чтобы не путать с визуальным ресайзом
    resizeGrid(newSize) {
        this.pause();
        this.size = newSize;
        this.grid = new Grid(this.size);
        
        this.renderer.grid = this.grid;
        this.renderer.resize(); // Пересчитываем геометрию под новую сетку
        
        this.randomize(); 
    }

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