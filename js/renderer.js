class Renderer {
    constructor(canvasId, grid) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        // Offscreen canvas для статичной сетки
        this.outlineCanvas = document.createElement('canvas');
        this.outlineCtx = this.outlineCanvas.getContext('2d', { alpha: false });

        this.grid = grid;
        
        this.colors = {
            bg: '#ffffff',
            outline: '#000000'
        };

        this.validCells = [];
        this.colorLUT = null;

        // Запускаем расчет размеров
        this.resize();
    }

    resize() {
        const wrapper = this.canvas.parentElement;
        
        // Получаем реальные размеры контейнера
        let availableWidth = wrapper.clientWidth;
        let availableHeight = wrapper.clientHeight;

        // Защита: если размеры 0 (например, при первой загрузке), пробуем чуть позже
        if (availableWidth === 0 || availableHeight === 0) {
            setTimeout(() => this.resize(), 50);
            return;
        }

        // Устанавливаем размеры канваса равными контейнеру
        this.canvas.width = availableWidth;
        this.canvas.height = availableHeight;
        
        this.outlineCanvas.width = availableWidth;
        this.outlineCanvas.height = availableHeight;
        
        // Минимальный отступ от краев (padding), чтобы сетка не прилипала
        const padding = 10; 
        
        let gridWidth = this.grid.size;
        
        // 1. Считаем размер стороны гекса (sideLength), если ограничиваем по ширине
        // Ширина сетки ≈ (cols + 0.5) * sqrt(3) * side
        const sideLengthByWidth = (availableWidth - padding * 2) / (gridWidth + 0.5) / Math.sqrt(3);
        
        // 2. Считаем размер стороны, если ограничиваем по высоте
        // Высота сетки ≈ (rows * 1.5 + 0.5) * side
        const sideLengthByHeight = (availableHeight - padding * 2) / (gridWidth * 1.5 + 0.5);

        // Выбираем меньшее значение, чтобы сетка влезла целиком
        this.sideLength = Math.min(sideLengthByWidth, sideLengthByHeight);
        
        // Округляем до сотых для четкости линий
        this.sideLength = Math.floor(this.sideLength * 100) / 100;

        // Геометрия гексагона
        this.hexAngle = 0.523598776; // 30 градусов в радианах
        this.hexHeight = Math.sin(this.hexAngle) * this.sideLength;
        this.hexRadius = Math.cos(this.hexAngle) * this.sideLength;
        this.hexRectHeight = this.sideLength + 2 * this.hexHeight;
        this.hexRectWidth = 2 * this.hexRadius;

        // Центрирование сетки на экране
        const totalGridWidth = (gridWidth + 0.5) * this.hexRectWidth;
        const totalGridHeight = (gridWidth * 1.5 * this.sideLength) + this.hexHeight;
        
        this.offsetX = (availableWidth - totalGridWidth) / 2;
        this.offsetY = (availableHeight - totalGridHeight) / 2;

        // Пересчет зависимых данных
        this.buildColorLUT();
        this.precomputeCellPositions();
        this.rebuildStaticOutline();
        
        // Отрисовка
        this.draw();
    }

    precomputeCellPositions() {
        this.validCells = [];
        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                const cell = this.grid.cells[row][col];
                if (!cell.isValid) continue;

                // Координаты с учетом центрирования (offsetX, offsetY)
                let x = col * this.hexRectWidth + ((row % 2) * this.hexRadius) + this.offsetX;
                let y = row * (this.sideLength + this.hexHeight) + this.offsetY;
                
                this.validCells.push({ cell, x, y });
            }
        }
    }

    rebuildStaticOutline() {
        const ctx = this.outlineCtx;
        
        // Заливаем фон
        ctx.fillStyle = this.colors.bg;
        ctx.fillRect(0, 0, this.outlineCanvas.width, this.outlineCanvas.height);

        // Адаптивная толщина линий: если клетки мелкие, линии тоньше
        ctx.lineWidth = (this.sideLength < 5) ? 0.5 : 1;
        ctx.strokeStyle = this.colors.outline;

        ctx.beginPath();
        for (const item of this.validCells) {
            this.traceHexagonPath(ctx, item.x, item.y);
        }
        ctx.stroke();
    }

    buildColorLUT() {
        // Таблица цветов для оптимизации (4 племени * 21 возраст)
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
        this.rebuildStaticOutline();
    }

    draw() {
        // 1. Рисуем фон с сеткой (копируем из оффскрин канваса)
        this.ctx.drawImage(this.outlineCanvas, 0, 0);

        // 2. Рисуем живые клетки
        for (const { cell, x, y } of this.validCells) {
            if (!cell.isAlive) continue;

            this.ctx.beginPath();
            this.traceHexagonPath(this.ctx, x, y);
            
            let age = cell.age;
            if (age > 20) age = 20;
            if (age < 0) age = 0;
            
            this.ctx.fillStyle = this.colorLUT[cell.tribe][age];
            this.ctx.fill();
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
        // Корректируем координаты мыши с учетом смещения сетки
        screenX -= this.offsetX;
        screenY -= this.offsetY;

        let hexY = Math.floor(screenY / (this.hexHeight + this.sideLength));
        let hexX = Math.floor((screenX - (hexY % 2) * this.hexRadius) / this.hexRectWidth);

        return { row: hexY, col: hexX };
    }
}