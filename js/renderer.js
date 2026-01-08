class Renderer {
    constructor(canvasId, grid) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.grid = grid;
        
        this.colors = {
            bg: '#ffffff',
            outline: '#000000'
        };

        this.resize();
    }

    resize() {
        // Set internal resolution
        this.canvas.width = Config.CANVAS_WIDTH;
        this.canvas.height = Config.CANVAS_HEIGHT;
        
        // Calculate hex dimensions based on grid size
        // sideLength calculation from original: 600 / (width + .5) / Math.sqrt(3)
        // Adjusted for new canvas size
        let width = this.grid.size;
        this.sideLength = (this.canvas.width - 20) / (width + 0.5) / Math.sqrt(3);
        
        this.hexAngle = 0.523598776; // 30 degrees
        this.hexHeight = Math.sin(this.hexAngle) * this.sideLength;
        this.hexRadius = Math.cos(this.hexAngle) * this.sideLength;
        this.hexRectHeight = this.sideLength + 2 * this.hexHeight;
        this.hexRectWidth = 2 * this.hexRadius;
    }

    setColors(bg, outline) {
        this.colors.bg = bg;
        this.colors.outline = outline;
        this.canvas.style.background = bg;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.lineWidth = (this.grid.size < 60) ? 0.5 : 0.25;
        this.ctx.strokeStyle = this.colors.outline;

        for (let row = 0; row < this.grid.size; row++) {
            for (let col = 0; col < this.grid.size; col++) {
                let cell = this.grid.cells[row][col];
                if (!cell.isValid) continue;

                let x = col * this.hexRectWidth + ((row % 2) * this.hexRadius);
                let y = row * (this.sideLength + this.hexHeight);

                // Centering offset
                x += 10; 
                y += 10;

                this.drawHexagon(x, y, cell);
            }
        }
    }

    drawHexagon(x, y, cell) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + this.hexRadius, y);
        this.ctx.lineTo(x + this.hexRectWidth, y + this.hexHeight);
        this.ctx.lineTo(x + this.hexRectWidth, y + this.hexHeight + this.sideLength);
        this.ctx.lineTo(x + this.hexRadius, y + this.hexRectHeight);
        this.ctx.lineTo(x, y + this.sideLength + this.hexHeight);
        this.ctx.lineTo(x, y + this.hexHeight);
        this.ctx.closePath();

        if (cell.isAlive) {
            let color = this.getCellColor(cell);
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }
        
        this.ctx.stroke();
    }

    getCellColor(cell) {
        let tribe = Config.TRIBES[cell.tribe];
        if (!tribe) return '#000000';

        let baseColor = tribe.color; // [r, g, b]
        let age = cell.age;
        if (age > 20) age = 20;
        if (age < 0) age = 0;

        // Fading logic from original
        // r = 255 - 255 * a / 22; etc...
        // Simplified generic fading: darker/lighter based on age
        // Or keep original specific logic per tribe if strictly needed.
        // Here is a generic implementation that fades to white/black based on age
        
        let r = baseColor[0], g = baseColor[1], b = baseColor[2];
        
        // Simple opacity/lightness simulation based on age
        // Original logic was very specific per tribe. Let's approximate:
        // Older = more intense or darker? Original seemed to fade OUT.
        
        let factor = 1 - (age / 22); 
        if (factor < 0) factor = 0;
        
        // Mix with white (255)
        r = Math.floor(r + (255 - r) * (1 - factor));
        g = Math.floor(g + (255 - g) * (1 - factor));
        b = Math.floor(b + (255 - b) * (1 - factor));

        return `rgb(${r},${g},${b})`;
    }

    // Convert screen coordinates to grid coordinates
    getGridCoordinate(screenX, screenY) {
        // Remove offset
        screenX -= 10;
        screenY -= 10;

        let hexY = Math.floor(screenY / (this.hexHeight + this.sideLength));
        let hexX = Math.floor((screenX - (hexY % 2) * this.hexRadius) / this.hexRectWidth);

        return { row: hexY, col: hexX };
    }
}