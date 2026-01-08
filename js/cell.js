class Cell {
    constructor(row, col, isValid) {
        this.row = row;
        this.col = col;
        this.isValid = isValid; // Находится ли клетка внутри шестиугольника
        
        this.isAlive = 0; // 0 - мертва, 1 - жива
        this.tribe = 0;   // ID племени
        this.age = 0;
        
        this.nextState = {
            isAlive: 0,
            tribe: 0,
            age: 0
        };
    }

    // Подготовка к следующему шагу (расчет состояния)
    calcNextState(neighbors) {
        if (!this.isValid) return;

        // Подсчет соседей по племенам
        let counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
        
        for (let n of neighbors) {
            if (n.isAlive) {
                // В оригинале учитывался возраст: sum = sum + neighbors[i].age
                // Но в правилах рождения (checkSwap) используются просто количества.
                // В оригинале countLivingNeighborsBlue суммирует age. Это странно для Game of Life,
                // но сохраним логику оригинала: сила соседа = его возраст.
                if (Config.TRIBES[n.tribe]) {
                    counts[n.tribe] += n.age;
                }
            }
        }

        let livingBlue = counts[0];
        let livingRed = counts[1];
        let livingGreen = counts[2];
        let livingPurple = counts[3];

        // Логика выживания (из оригинала)
        let willDie = false;
        if (this.isAlive) {
            if (this.tribe === 0) { // Blue
                if (livingBlue < 7 || livingBlue + 2 * livingRed > 29) willDie = true;
            } else if (this.tribe === 1) { // Red
                if (livingRed < 11 || livingBlue + livingRed > 37) willDie = true;
            } else if (this.tribe === 2) { // Green
                if (livingBlue + livingRed + livingGreen < 22 || livingGreen > 24) willDie = true;
            } else if (this.tribe === 3) { // Purple
                if (livingPurple < 11 || livingPurple > 34) willDie = true;
            }
            
            if (willDie) {
                this.nextState.isAlive = -1; // Маркер умирания
                this.nextState.tribe = this.tribe;
                this.nextState.age = this.age; // Возраст пока сохраняем для анимации угасания
            } else {
                this.nextState.isAlive = 1;
                this.nextState.tribe = this.tribe;
                this.nextState.age = this.age + 1; // Старение
            }
        } 
        // Логика рождения (из оригинала)
        else {
            let newTribe = -1;

            // Условия рождения
            let livingNewBlue = (livingBlue >= 20 && livingBlue <= 22);
            let livingNewRed = (livingRed === 20);
            let livingNewPurple = (livingPurple >= 21 && livingPurple <= 23);
            let livingNewGreen = (livingGreen === 20 || livingGreen === 21);

            // Purple priority
            if (livingNewPurple) {
                newTribe = 3;
            } else if (livingNewBlue && !livingNewRed) {
                newTribe = 0;
            } else if (!livingNewBlue && livingNewRed) {
                newTribe = 1;
            } else {
                // Green logic complex check
                let blueRange = (livingBlue >= 14 && livingBlue <= 19);
                let redRange = (livingRed >= 14 && livingRed <= 19);
                
                if ((livingNewGreen && (livingBlue + livingRed > 14)) || (blueRange && redRange)) {
                    newTribe = 2;
                }
            }

            if (newTribe !== -1) {
                this.nextState.isAlive = 1;
                this.nextState.tribe = newTribe;
                this.nextState.age = 1; // Новорожденный
            } else {
                this.nextState.isAlive = 0;
                this.nextState.age = 0;
            }
        }
    }

    // Применение следующего состояния
    applyNextState() {
        if (!this.isValid) return;

        // Обработка умирания (плавное затухание возраста)
        if (this.nextState.isAlive === -1) {
            if (this.tribe === 3) this.age -= 3;
            else this.age -= 4;
            
            if (this.age <= 0) {
                this.isAlive = 0;
                this.age = 0;
            } else {
                this.isAlive = 1; // Все еще виден, но угасает
            }
        } else {
            this.isAlive = this.nextState.isAlive;
            this.tribe = this.nextState.tribe;
            this.age = this.nextState.age;
        }

        if (this.age > 20) this.age = 20; // Cap age
    }
}