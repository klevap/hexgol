class Renderer {
    constructor(gridCanvasId, cellsCanvasId, grid) {
        // Слой 0: Фон и сетка (статичный)
        this.gridCanvas = document.getElementById(gridCanvasId);
        // ВАЖНО: alpha: true, чтобы поддерживать прозрачность
        this.gridCtx = this.gridCanvas.getContext('2d', { alpha: true }); 

        // Слой 1: Клетки (динамичный)
        this.cellsCanvas = document.getElementById(cellsCanvasId);
        this.cellsCtx = this.cellsCanvas.getContext('2d', { alpha: true });

        this.grid = grid;
        
        this.colors = {
            bg: '#ffffff',
            outline: '#000000'
        };

        // Флаги видимости и настроек
        this.showBg = true;
        this.showOutline = true;
        this.invertAging = false; // false: Молодые=Цветные, true: Молодые=Белые

        this.validCells = [];
        this.colorLUT = null;

        // Запускаем расчет размеров
        this.resize();
    }

    resize() {
        const wrapper = this.gridCanvas.parentElement;
        
        let availableWidth = wrapper.clientWidth;
        let availableHeight = wrapper.clientHeight;

        if (availableWidth === 0 || availableHeight === 0) {
            setTimeout(() => this.resize(), 50);
            return;
        }

        // Ресайзим оба канваса
        this.gridCanvas.width = availableWidth;
        this.gridCanvas.height = availableHeight;
        
        this.cellsCanvas.width = availableWidth;
        this.cellsCanvas.height = availableHeight;
        
        const padding = 10; 
        let gridWidth = this.grid.size;
        
        const sideLengthByWidth = (availableWidth - padding * 2) / (gridWidth + 0.5) / Math.sqrt(3);
        const sideLengthByHeight = (availableHeight - padding * 2) / (gridWidth * 1.5 + 0.5);

        this.sideLength = Math.min(sideLengthByWidth, sideLengthByHeight);
        this.sideLength = Math.floor(this.sideLength * 100) / 100;

        this.hexAngle = 0.523598776;
        this.hexHeight = Math.sin(this.hexAngle) * this.sideLength;
        this.hexRadius = Math.cos(this.hexAngle) * this.sideLength;
        this.hexRectHeight = this.sideLength + 2 * this.hexHeight;
        this.hexRectWidth = 2 * this.hexRadius;

        const totalGridWidth = (gridWidth + 0.5) * this.hexRectWidth;
        const totalGridHeight = (gridWidth * 1.5 * this.sideLength) + this.hexHeight;
        
        this.offsetX = (availableWidth - totalGridWidth) / 2;
        this.offsetY = (availableHeight - totalGridHeight) / 2;

        this.buildColorLUT();
        this.precomputeCellPositions();
        
        // Перерисовываем статичный слой
        this.rebuildStaticOutline();
        
        // Перерисовываем клетки
        this.draw();
    }

    precomputeCellPositions() {
        this.validCells = [];
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const cell = this.grid.cells[row][col];
                if (!cell.isValid) continue;

                let x = col * this.hexRectWidth + ((row % 2) * this.hexRadius) + this.offsetX;
                let y = row * (this.sideLength + this.hexHeight) + this.offsetY;
                
                this.validCells.push({ cell, x, y });
            }
        }
    }

    rebuildStaticOutline() {
        const ctx = this.gridCtx;
        const w = this.gridCanvas.width;
        const h = this.gridCanvas.height;
        
        // 1. Очищаем канвас
        ctx.clearRect(0, 0, w, h);

        // 2. Если фон включен, заливаем цветом
        if (this.showBg) {
            ctx.fillStyle = this.colors.bg;
            ctx.fillRect(0, 0, w, h);
        }

        // 3. Если сетка включена, рисуем её
        if (this.showOutline) {
            // ОПТИМИЗАЦИЯ: Если цвет фона совпадает с цветом сетки и фон включен, не рисуем линии
            if (this.showBg && this.colors.bg === this.colors.outline) {
                return;
            }

            ctx.lineWidth = (this.sideLength < 5) ? 0.5 : 1;
            ctx.strokeStyle = this.colors.outline;

            // --- ИСПРАВЛЕНИЕ ЗАВИСАНИЯ (BATCHING) ---
            // Вместо одного огромного пути, разбиваем отрисовку на порции.
            // HTML5 Canvas очень плохо переваривает stroke() для путей с >10k точками.
            
            const BATCH_SIZE = 3000; // Рисуем по 3000 гексов за раз
            let count = 0;

            ctx.beginPath();
            for (const item of this.validCells) {
                this.traceHexagonPath(ctx, item.x, item.y);
                count++;

                if (count % BATCH_SIZE === 0) {
                    ctx.stroke();
                    ctx.beginPath();
                }
            }
            ctx.stroke();
        }
    }

    setInvertAging(val) {
        this.invertAging = val;
        this.buildColorLUT();
        this.draw();
    }

    buildColorLUT() {
        this.colorLUT = Array.from({ length: 4 }, () => Array(21).fill('#000'));
        
        for (let t = 0; t < 4; t++) {
            const base = Config.TRIBES[t].color;
            
            for (let age = 0; age <= 20; age++) {
                let whiteAmount;

                if (this.invertAging) {
                    // ИНВЕРСИЯ: Молодые (Age 1) -> Белые, Старые (Age 20) -> Цветные
                    // whiteAmount должен быть высоким при малом age
                    whiteAmount = 1 - (age / 22);
                } else {
                    // СТАНДАРТ: Молодые (Age 1) -> Цветные, Старые (Age 20) -> Белые
                    // whiteAmount должен быть низким при малом age
                    whiteAmount = age / 22;
                }

                // Клампинг значений
                if (whiteAmount < 0) whiteAmount = 0;
                if (whiteAmount > 1) whiteAmount = 1;

                // Смешивание: BaseColor + (White - BaseColor) * whiteAmount
                let r = Math.floor(base[0] + (255 - base[0]) * whiteAmount);
                let g = Math.floor(base[1] + (255 - base[1]) * whiteAmount);
                let b = Math.floor(base[2] + (255 - base[2]) * whiteAmount);
                
                this.colorLUT[t][age] = `rgb(${r},${g},${b})`;
            }
        }
    }

    setColors(bg, outline) {
        this.colors.bg = bg;
        this.colors.outline = outline;
        this.rebuildStaticOutline();
    }

    setVisibility(showBg, showOutline) {
        this.showBg = showBg;
        this.showOutline = showOutline;
        this.rebuildStaticOutline();
    }

    draw() {
        this.cellsCtx.clearRect(0, 0, this.cellsCanvas.width, this.cellsCanvas.height);

        // Рисуем живые клетки
        // Здесь тоже можно применить батчинг, если живых клеток станет > 20-30 тысяч,
        // но обычно fill() работает быстрее чем stroke() для сложных путей.
        // Однако для надежности добавим батчинг и сюда.
        
        const BATCH_SIZE = 3000;
        let count = 0;
        let currentTribe = -1;
        let currentAge = -1;

        // Сортировка не обязательна, но переключение fillStyle дорогое.
        // В простой реализации просто рисуем.
        
        for (const { cell, x, y } of this.validCells) {
            if (!cell.isAlive) continue;

            let age = cell.age;
            if (age > 20) age = 20;
            if (age < 0) age = 0;
            
            this.cellsCtx.fillStyle = this.colorLUT[cell.tribe][age];
            this.cellsCtx.beginPath();
            this.traceHexagonPath(this.cellsCtx, x, y);
            this.cellsCtx.fill();
        }
    }

    traceHexagonPath(ctx, x, y) {
        ctx.moveTo(x + this.hexRadius, y);
        ctx.lineTo(x + this.hexRectWidth, y + this.hexHeight);
        ctx.lineTo(x + this.hexRectWidth, y + this.hexHeight + this.sideLength);
        ctx.lineTo(x + this.hexRadius, y + this.hexRectHeight);
        ctx.lineTo(x, y + this.sideLength + this.hexHeight);
        ctx.lineTo(x, y + this.hexHeight);
        ctx.closePath();
    }

    getGridCoordinate(screenX, screenY) {
        screenX -= this.offsetX;
        screenY -= this.offsetY;

        let hexY = Math.floor(screenY / (this.hexHeight + this.sideLength));
        let hexX = Math.floor((screenX - (hexY % 2) * this.hexRadius) / this.hexRectWidth);

        return { row: hexY, col: hexX };
    }
}