class Renderer {
    constructor(canvasId, grid) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Оптимизация: без альфа-канала
        
        // Offscreen canvas для статичной сетки
        this.outlineCanvas = document.createElement('canvas');
        this.outlineCtx = this.outlineCanvas.getContext('2d', { alpha: false });

        this.grid = grid;
        
        this.colors = {
            bg: '#ffffff',
            outline: '#000000'
        };

        // Кеш координат валидных клеток
        this.validCells = [];
        // Кеш цветов (LUT)
        this.colorLUT = null;

        this.resize();
    }

    resize() {
        // Установка размеров
        this.canvas.width = Config.CANVAS_WIDTH;
        this.canvas.height = Config.CANVAS_HEIGHT;
        
        this.outlineCanvas.width = Config.CANVAS_WIDTH;
        this.outlineCanvas.height = Config.CANVAS_HEIGHT;
        
        // Расчет геометрии
        let width = this.grid.size;
        this.sideLength = (this.canvas.width - 20) / (width + 0.5) / Math.sqrt(3);
        
        this.hexAngle = 0.523598776; // 30 deg
        this.hexHeight = Math.sin(this.hexAngle) * this.sideLength;
        this.hexRadius = Math.cos(this.hexAngle) * this.sideLength;
        this.hexRectHeight = this.sideLength + 2 * this.hexHeight;
        this.hexRectWidth = 2 * this.hexRadius;

        // Пересчет зависимых данных
        this.buildColorLUT();
        this.precomputeCellPositions();
        this.rebuildStaticOutline();
        
        // Первая отрисовка
        this.draw();
    }

    // ОПТИМИЗАЦИЯ: Предрасчет координат, чтобы не считать их каждый кадр
    precomputeCellPositions() {
        this.validCells = [];
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const cell = this.grid.cells[row][col];
                if (!cell.isValid) continue;

                let x = col * this.hexRectWidth + ((row % 2) * this.hexRadius) + 10;
                let y = row * (this.sideLength + this.hexHeight) + 10;
                
                this.validCells.push({ cell, x, y });
            }
        }
    }

    // ОПТИМИЗАЦИЯ: Рисуем сетку один раз в оффскрин
    rebuildStaticOutline() {
        const ctx = this.outlineCtx;
        
        // Заливаем фон
        ctx.fillStyle = this.colors.bg;
        ctx.fillRect(0, 0, this.outlineCanvas.width, this.outlineCanvas.height);

        ctx.lineWidth = (this.grid.size < 60) ? 0.5 : 0.25;
        ctx.strokeStyle = this.colors.outline;

        // Batching: один beginPath на все линии
        ctx.beginPath();
        for (const item of this.validCells) {
            this.traceHexagonPath(ctx, item.x, item.y);
        }
        ctx.stroke();
    }

    // ОПТИМИЗАЦИЯ: Таблица цветов (Look Up Table)
    buildColorLUT() {
        // 4 племени, 21 возраст (0-20)
        this.colorLUT = Array.from({ length: 4 }, () => Array(21).fill('#000'));
        
        for (let t = 0; t < 4; t++) {
            const base = Config.TRIBES[t].color;
            for (let age = 0; age <= 20; age++) {
                let factor = 1 - (age / 22);
                if (factor < 0) factor = 0;
                
                let r = Math.floor(base[0] + (255 - base[0]) * (1 - factor));
                let g = Math.floor(base[1] + (255 - base[1]) * (1 - factor));
                let b = Math.floor(base[2] + (255 - base[2]) * (1 - factor));
                
                this.colorLUT[t][age] = `rgb(${r},${g},${b})`;
            }
        }
    }

    setColors(bg, outline) {
        this.colors.bg = bg;
        this.colors.outline = outline;
        // При смене цветов перерисовываем фон
        this.rebuildStaticOutline();
    }

    // Основной метод отрисовки
    draw() {
        // 1. Очищаем канвас (копируем готовый фон с сеткой)
        // Это быстрее, чем clearRect + stroke()
        this.ctx.drawImage(this.outlineCanvas, 0, 0);

        // 2. Рисуем только живые клетки
        // beginPath не делаем общим, так как нужен fill для каждого цвета
        // Но можно группировать по цветам, если нужно еще быстрее. Пока так.
        for (const { cell, x, y } of this.validCells) {
            if (!cell.isAlive) continue;

            this.ctx.beginPath();
            this.traceHexagonPath(this.ctx, x, y);
            
            // Берем цвет из кеша
            let age = cell.age;
            if (age > 20) age = 20;
            if (age < 0) age = 0;
            
            this.ctx.fillStyle = this.colorLUT[cell.tribe][age];
            this.ctx.fill();
            // stroke не нужен, он уже есть на фоне
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
        screenX -= 10;
        screenY -= 10;

        let hexY = Math.floor(screenY / (this.hexHeight + this.sideLength));
        let hexX = Math.floor((screenX - (hexY % 2) * this.hexRadius) / this.hexRectWidth);

        return { row: hexY, col: hexX };
    }
}