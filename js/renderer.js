class Renderer {
    constructor(gridCanvasId, cellsCanvasId, grid) {
        // Слой 0: Фон и сетка (статичный)
        this.gridCanvas = document.getElementById(gridCanvasId);
        this.gridCtx = this.gridCanvas.getContext('2d', { alpha: false }); // alpha: false для скорости фона

        // Слой 1: Клетки (динамичный)
        this.cellsCanvas = document.getElementById(cellsCanvasId);
        this.cellsCtx = this.cellsCanvas.getContext('2d', { alpha: true }); // alpha: true для прозрачности

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
        
        // 1. Заливаем фон
        ctx.fillStyle = this.colors.bg;
        ctx.fillRect(0, 0, w, h);

        // ОПТИМИЗАЦИЯ: Если цвет фона совпадает с цветом сетки, не рисуем линии
        // Это убирает лаги при ресайзе на больших картах в режиме "черное на черном"
        if (this.colors.bg === this.colors.outline) {
            return;
        }

        ctx.lineWidth = (this.sideLength < 5) ? 0.5 : 1;
        ctx.strokeStyle = this.colors.outline;

        ctx.beginPath();
        // Рисуем все гексы одним путем (batching)
        for (const item of this.validCells) {
            this.traceHexagonPath(ctx, item.x, item.y);
        }
        ctx.stroke();
    }

    buildColorLUT() {
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
        // Очищаем только слой с клетками (прозрачность)
        this.cellsCtx.clearRect(0, 0, this.cellsCanvas.width, this.cellsCanvas.height);

        // Рисуем живые клетки
        for (const { cell, x, y } of this.validCells) {
            if (!cell.isAlive) continue;

            this.cellsCtx.beginPath();
            this.traceHexagonPath(this.cellsCtx, x, y);
            
            let age = cell.age;
            if (age > 20) age = 20;
            if (age < 0) age = 0;
            
            this.cellsCtx.fillStyle = this.colorLUT[cell.tribe][age];
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