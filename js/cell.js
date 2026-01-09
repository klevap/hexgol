class Cell {
    constructor(row, col, isValid) {
        this.row = row;
        this.col = col;
        this.isValid = isValid; 
        
        this.isAlive = 0; 
        this.tribe = 0;   
        this.age = 0;
        
        this.neighbors = [];

        this.nextAlive = 0;
        this.nextTribe = 0;
        this.nextAge = 0;

        // Кэш для сумм: [Blue, Red, Green, Purple, SpecialSum]
        this.inputSums = [0, 0, 0, 0, 0];
    }

    calcNextState() {
        if (!this.isValid) return;

        // 1. Сброс сумм
        this.inputSums.fill(0);
        
        const neighbors = this.neighbors;
        const len = neighbors.length;

        // 2. Расчет стандартных сумм и SpecialSum
        for (let i = 0; i < len; i++) {
            const n = neighbors[i];
            if (n.isAlive) {
                const val = n.age;
                
                // Стандартная сумма по племенам
                this.inputSums[n.tribe] += val;

                // Special Sum Logic
                // Находим соседей соседа в кольце (циклически)
                // i - индекс текущего соседа в массиве neighbors
                // (i - 1 + len) % len - индекс соседа слева
                // (i + 1) % len - индекс соседа справа
                
                const leftIdx = (i - 1 + len) % len;
                const rightIdx = (i + 1) % len;
                
                const leftN = neighbors[leftIdx];
                const rightN = neighbors[rightIdx];

                // Проверяем цвета (племена)
                // Важно: если сосед мертв, его tribe может быть старым, 
                // но в контексте задачи обычно сравнивают tribe живых или просто tribe.
                // Будем считать tribe даже у мертвых (свойство клетки), 
                // либо 0, если считать мертвых нейтральными. 
                // В оригинале tribe сохраняется при смерти.
                
                const myTribe = n.tribe;
                const leftTribe = leftN.tribe; // Берем tribe даже если isAlive=0
                const rightTribe = rightN.tribe;

                if (leftTribe !== myTribe && rightTribe !== myTribe) {
                    // Оба соседа другого цвета -> Плюсуем
                    this.inputSums[4] += val;
                } else if (leftTribe === myTribe && rightTribe === myTribe) {
                    // Оба соседа такого же цвета -> Минусуем
                    this.inputSums[4] -= val;
                }
                // Иначе (один такой же, один другой) -> 0 (не меняем сумму)
            }
        }

        // --- ЛОГИКА ВЫЖИВАНИЯ ---
        if (this.isAlive) {
            const config = Config.TRIBES[this.tribe].survival;
            
            // Проверяем структуру: (G1R1 И G1R2) ИЛИ (G2R1 И G2R2)
            const group1 = this.checkRule(config.group1[0]) && this.checkRule(config.group1[1]);
            const group2 = this.checkRule(config.group2[0]) && this.checkRule(config.group2[1]);

            if (group1 || group2) {
                this.nextAlive = 1;
                this.nextTribe = this.tribe;
                this.nextAge = this.age + 1;
            } else {
                this.nextAlive = -1; // Умирает
                this.nextTribe = this.tribe;
                this.nextAge = this.age;
            }
        } 
        // --- ЛОГИКА РОЖДЕНИЯ ---
        else {
            let bestCandidate = -1;
            let maxPriority = -1;

            for (let tId = 0; tId < Config.TRIBES.length; tId++) {
                const tribeConf = Config.TRIBES[tId];
                
                if (tribeConf.priority <= maxPriority) continue;

                const config = tribeConf.birth;
                
                // Проверяем структуру: (G1R1 И G1R2) ИЛИ (G2R1 И G2R2)
                const group1 = this.checkRule(config.group1[0]) && this.checkRule(config.group1[1]);
                const group2 = this.checkRule(config.group2[0]) && this.checkRule(config.group2[1]);

                if (group1 || group2) {
                    bestCandidate = tId;
                    maxPriority = tribeConf.priority;
                }
            }

            if (bestCandidate !== -1) {
                this.nextAlive = 1;
                this.nextTribe = bestCandidate;
                this.nextAge = 1;
            } else {
                this.nextAlive = 0;
                this.nextAge = 0;
            }
        }
    }

    // Вспомогательный метод проверки одного правила
    checkRule(rule) {
        let sum = 0;
        // Скалярное произведение весов на входные суммы
        // weights имеет длину 5: [Blue, Red, Green, Purple, SpecialSum]
        for (let i = 0; i < 5; i++) {
            sum += rule.weights[i] * this.inputSums[i];
        }
        return sum >= rule.min && sum <= rule.max;
    }

    applyNextState() {
        if (!this.isValid) return;

        if (this.nextAlive === -1) {
            const decay = Config.TRIBES[this.tribe].decay || 4;
            this.age -= decay;
            
            if (this.age <= 0) {
                this.isAlive = 0;
                this.age = 0;
            } else {
                this.isAlive = 1; 
            }
        } else {
            this.isAlive = this.nextAlive;
            this.tribe = this.nextTribe;
            this.age = this.nextAge;
        }

        if (this.age > Config.MAX_AGE) this.age = Config.MAX_AGE;
    }
}