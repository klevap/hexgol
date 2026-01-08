class Grid {
    constructor(size) {
        this.size = size;
        this.cells = [];
        this.initGrid();
    }

    initGrid() {
        this.cells = [];
        let n = this.size;
        // Логика определения размера шестиугольника (из оригинала)
        if (n > this.size) n = this.size;
        let mid = Math.floor((n - 1) / 2);

        for (let row = 0; row < this.size; row++) {
            let rowArr = [];
            for (let col = 0; col < this.size; col++) {
                // Логика маскирования шестиугольника (offset coordinates)
                let isValid = true;
                
                // Обрезка углов прямоугольной матрицы для получения гексагона
                if (row % 2 === 0 && (row < mid && (col < (mid - row) / 2 || col > 2 * mid - (mid - row) / 2))) isValid = false;
                if (row % 2 === 1 && (row < mid && (col < (mid - row) / 2 - 1 || col > 2 * mid - (mid - row) / 2))) isValid = false;
                if (row % 2 === 0 && (row > mid && (col < (row - mid) / 2 || col > 2 * mid - (row - mid) / 2))) isValid = false;
                if (row % 2 === 1 && (row > mid && (col < (row - mid) / 2 - 1 || col > 2 * mid - (row - mid) / 2))) isValid = false;

                rowArr.push(new Cell(row, col, isValid));
            }
            this.cells.push(rowArr);
        }
    }

    getCell(row, col) {
        if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
            return this.cells[row][col];
        }
        return null;
    }

    // Установка параметров клетки (вспомогательный метод для генераторов)
    setCell(r, c, alive, tribe, age) {
        let cell = this.getCell(r, c);
        if (cell && cell.isValid) {
            cell.isAlive = alive;
            cell.tribe = tribe;
            cell.age = age;
        }
    }

    getNeighbors(cell) {
        let neighbors = [];
        let r = cell.row;
        let c = cell.col;
        
        // Соседи для гексагональной сетки (offset coordinates)
        let candidates = [
            {r: r, c: c - 1},     // Left
            {r: r, c: c + 1},     // Right
            {r: r - 1, c: c},     // Up
            {r: r + 1, c: c}      // Down
        ];

        // Диагональные соседи зависят от четности ряда
        if (r % 2 === 0) {
            candidates.push({r: r - 1, c: c - 1});
            candidates.push({r: r + 1, c: c - 1});
        } else {
            candidates.push({r: r - 1, c: c + 1});
            candidates.push({r: r + 1, c: c + 1});
        }

        for (let cand of candidates) {
            let n = this.getCell(cand.r, cand.c);
            if (n && n.isValid) {
                neighbors.push(n);
            }
        }
        return neighbors;
    }

    update() {
        // 1. Рассчитываем следующее состояние для всех клеток
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                let cell = this.cells[row][col];
                if (cell.isValid) {
                    cell.calcNextState(this.getNeighbors(cell));
                }
            }
        }
        // 2. Применяем состояние
        let hasLife = false;
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                let cell = this.cells[row][col];
                if (cell.isValid) {
                    cell.applyNextState();
                    if (cell.isAlive) hasLife = true;
                }
            }
        }
        return hasLife;
    }

    clear() {
        for (let row of this.cells) {
            for (let cell of row) {
                cell.isAlive = 0;
                cell.age = 0;
                cell.tribe = 0;
            }
        }
    }

    // =====================
    // ГЕНЕРАТОРЫ СИММЕТРИЙ
    // =====================

    randomizeSym2() {
        this.clear();
        let c = 0;
        let h = Math.floor(this.size / 2);
        
        for(let i = 0; i < this.size; i++) {
            for(let j = 0; j < h; j++) {
                let num = Math.random();
                let alive = 0, tribe = 0, age = 0;

                if(num < 0.4) {
                    alive = 1;
                    c = (c > 0) ? 0 : 1;
                    if(num > 0.35) c = 0;
                }

                if(alive) {
                    age = Math.floor(1 + 19 * Math.random());
                    tribe = c;
                }

                // Симметрия
                let k = (i % 2 === 0) ? 2 * h - j : 2 * h - j - 1;

                this.setCell(i, j, alive, tribe, age);
                this.setCell(i, k, alive, tribe, age);
            }
        }
    }

    randomizeSym3() {
        this.clear();
        let c = Math.floor(1.99 * Math.random());
        let c2 = c;
        let d = Math.floor(2.99 * Math.random());
        let h = Math.floor(this.size / 2);

        for(let i = 0; i < h + 1; i++) {
            for(let j = 0; j < i + 1; j++) {
                // Logic 1
                let alive = 0, tribe = 0, age = 0;
                if(Math.random() < 0.55) {
                    alive = 1;
                    if(i % 4 - d === 0 || j % 3 === 0)
                        c = (c > 0) ? 0 : 1;
                }
                if(alive) {
                    age = Math.floor(1 + 19 * Math.random());
                    tribe = c;
                }

                // Logic 2
                let alive2 = 0, tribe2 = 0, age2 = 0;
                if(Math.random() < 0.55) {
                    alive2 = 1;
                    if(i % 3 === 0 || j % 3 + d === 0)
                        c2 = (c2 > 0) ? 0 : 1;
                }
                if(alive2) {
                    age2 = Math.floor(1 + 19 * Math.random());
                    tribe2 = c2;
                }

                // Rotation 1
                let a = h - i + Math.floor(j / 2);
                let b = h - j;
                this.setCell(b, a, alive, tribe, age);

                let a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                let b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive2, tribe2, age2);

                // Rotation 2
                a = h + i - Math.floor((i - j + 1) / 2);
                b = h - i + j;
                this.setCell(b, a, alive, tribe, age);

                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive2, tribe2, age2);

                // Rotation 3
                a = h - j + Math.floor(i / 2);
                b = h + i;
                this.setCell(b, a, alive, tribe, age);

                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive2, tribe2, age2);
            }
        }
    }

    randomizeSym4() {
        this.clear();
        let c = 0;
        let h = Math.floor(this.size / 2);
        
        for(let i = 0; i < h; i++) {
            for(let j = 0; j < h; j++) {
                let alive = 0, tribe = 0, age = 0;
                let num = Math.random();
                if(num < 0.45) {
                    alive = 1;
                    c = (c > 0) ? 0 : 1;
                    if(num > 0.4) c = 0;
                }

                if(alive) {
                    age = Math.floor(1 + 19 * Math.random());
                    tribe = c;
                }

                let k = (i % 2 === 0) ? 2 * h - j : 2 * h - j - 1;

                this.setCell(2 * h - i, j, alive, tribe, age);
                this.setCell(i, j, alive, tribe, age);
                this.setCell(i, k, alive, tribe, age);
                this.setCell(2 * h - i, k, alive, tribe, age);
            }
        }
    }

    randomizeSym6() {
        this.clear();
        let c = 0;
        let h = Math.floor(this.size / 2);
        let num2 = Math.random(); // Constant for the generation
        
        for(let i = 0; i < h + 1; i++) {
            for(let j = 0; j < i + 1; j++) {
                let num = Math.random();
                let alive = 0, tribe = 0, age = 0;

                if(num < 0.55) {
                    alive = 1;
                    if(h > 10) {
                        c = (c > 0) ? 0 : 1;
                        if(num > 0.45) c = 0;
                    } else {
                        if(num2 > 0.6666) c = 3;
                        else if(num2 > 0.3333) c = 1;
                        else c = 0;
                    }
                }

                if(alive) {
                    age = Math.floor(1 + 19 * Math.random());
                    tribe = c;
                }

                // 1
                let a = h - i + Math.floor(j / 2);
                let b = h - j;
                this.setCell(b, a, alive, tribe, age);
                
                // 1-Mirror
                let a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                let b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
                
                // 2
                a = h + i - Math.floor((i - j + 1) / 2);
                b = h - i + j;
                this.setCell(b, a, alive, tribe, age);

                // 2-Mirror
                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
                
                // 3
                a = h - j + Math.floor(i / 2);
                b = h + i;
                this.setCell(b, a, alive, tribe, age);
                
                // 3-Mirror
                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
            }
        }
    }

    randomizeSym32() {
        this.clear();
        let c = 0;
        let h = Math.floor(this.size / 2);
        let num2 = Math.random();
        
        for(let i = 0; i < h + 1; i++) {
            for(let j = 0; j < i + 1; j++) {
                let num = Math.random();
                let alive = 0, tribe = 0, age = 0;

                if(num < 0.55) {
                    alive = 1;
                    if(h > 10) {
                        c = (c > 0) ? 0 : 1;
                        if(num > 0.45) c = 0;
                    } else {
                        if(num2 > 0.6666) c = 3;
                        else if(num2 > 0.3333) c = 1;
                        else c = 0;
                    }
                }

                if(alive) {
                    age = Math.floor(1 + 19 * Math.random());
                    tribe = c;
                }

                // 1
                let a = h - i + Math.floor(j / 2);
                let b = h - j;
                this.setCell(b, a, alive, tribe, age);
                
                // 1-Special Mirror
                if(j % 2 === 1 && i % 2 === 1) {
                    a = h + Math.floor(i / 2) + Math.floor(j / 2) + 1;
                } else {
                    a = h + Math.floor(i / 2) + Math.floor(j / 2);
                }
                b = h + i - j;
                this.setCell(b, a, alive, tribe, age);
                
                // 2
                a = h + i - Math.floor((i - j + 1) / 2);
                b = h - i + j;
                this.setCell(b, a, alive, tribe, age);
                
                // 2-Special Mirror
                a = h - i + Math.floor(j / 2);
                b = h + j;
                this.setCell(b, a, alive, tribe, age);

                // 3
                a = h - j + Math.floor(i / 2);
                b = h + i;
                this.setCell(b, a, alive, tribe, age);
                
                // 3-Special Mirror
                a = h - j + Math.floor(i / 2);
                b = h - i;
                this.setCell(b, a, alive, tribe, age);
            }
        }
    }

    randomizeSym62() {
        this.clear();
        let c = 0;
        let h = Math.floor(this.size / 2);
        let num2 = Math.random();
        
        for(let i = 0; i < h + 1; i++) {
            for(let j = 0; j < Math.floor((i + 1) / 2); j++) {
                let num = Math.random();
                let alive = 0, tribe = 0, age = 0;

                if(num < 0.55) {
                    alive = 1;
                    if(h > 10) {
                        c = (c > 0) ? 0 : 1;
                        if(num > 0.45) c = 0;
                    } else {
                        if(num2 > 0.6666) c = 3;
                        else if(num2 > 0.3333) c = 1;
                        else c = 0;
                    }
                }

                if(alive) {
                    age = Math.floor(1 + 19 * Math.random());
                    tribe = c;
                }

                // 1
                let a = h - i + Math.floor(j / 2);
                let b = h - j;
                this.setCell(b, a, alive, tribe, age);
                
                // 1-Mirror
                let a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                let b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
                
                // 1-2
                a = h - i + Math.floor((i - j) / 2);
                b = h - i + j;
                this.setCell(b, a, alive, tribe, age);
                
                // 1-2 Mirror
                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
                
                // 2
                a = h + i - Math.floor((i - j + 1) / 2);
                b = h - i + j;
                this.setCell(b, a, alive, tribe, age);

                // 2-Mirror
                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
                
                // 2-2
                a = h + i - Math.floor((j + 1) / 2);
                b = h - j;
                this.setCell(b, a, alive, tribe, age);

                // 2-2 Mirror
                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
                
                // 3
                a = h - j + Math.floor(i / 2);
                b = h + i;
                this.setCell(b, a, alive, tribe, age);
                
                // 3-Mirror
                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
                
                // 3-2
                a = h - i + j + Math.floor(i / 2);
                b = h + i;
                this.setCell(b, a, alive, tribe, age);
                
                // 3-2 Mirror
                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive, tribe, age);
            }
        }
    }

    randomizePurpleSym3() {
        this.clear();
        let c = Math.floor(1.99 * Math.random());
        let c2 = c;
        let d = Math.floor(2.99 * Math.random());
        let h = Math.floor(this.size / 2);

        for(let i = 0; i < h + 1; i++) {
            for(let j = 0; j < i + 1; j++) {
                // Logic 1
                let alive = 0, tribe = 0, age = 0;
                if(Math.random() < 0.55) {
                    alive = 1;
                    if(i % 4 - d === 0 || j % 3 === 0)
                        c = (c > 0) ? 0 : 3; // Purple (3) instead of 1
                }
                if(alive) {
                    age = Math.floor(1 + 19 * Math.random());
                    tribe = c;
                }

                // Logic 2
                let alive2 = 0, tribe2 = 0, age2 = 0;
                if(Math.random() < 0.55) {
                    alive2 = 1;
                    if(i % 3 === 0 || j % 3 + d === 0)
                        c2 = (c2 > 0) ? 0 : 1;
                }
                if(alive2) {
                    age2 = Math.floor(1 + 19 * Math.random());
                    tribe2 = c2;
                }

                // Rotation 1
                let a = h - i + Math.floor(j / 2);
                let b = h - j;
                this.setCell(b, a, alive, tribe, age);

                let a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                let b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive2, tribe2, age2);

                // Rotation 2
                a = h + i - Math.floor((i - j + 1) / 2);
                b = h - i + j;
                this.setCell(b, a, alive, tribe, age);

                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive2, tribe2, age2);

                // Rotation 3
                a = h - j + Math.floor(i / 2);
                b = h + i;
                this.setCell(b, a, alive, tribe, age);

                a_sym = (b % 2 === 0) ? 2 * h - a : 2 * h - 1 - a;
                b_sym = 2 * h - b;
                this.setCell(b_sym, a_sym, alive2, tribe2, age2);
            }
        }
    }
}