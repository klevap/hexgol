class Cell {
    constructor(row, col, isValid) {
        this.row = row;
        this.col = col;
        this.isValid = isValid; 
        
        this.isAlive = 0; 
        this.tribe = 0;   
        this.age = 0;
        
        // Ссылка на соседей (заполняется в Grid)
        this.neighbors = [];

        // Следующее состояние (плоская структура вместо объекта)
        this.nextAlive = 0;
        this.nextTribe = 0;
        this.nextAge = 0;
    }

    // Подготовка к следующему шагу (расчет состояния)
    // neighbors теперь берется из this.neighbors, аргумент не нужен, 
    // но оставим сигнатуру или будем использовать this.neighbors напрямую
    calcNextState() {
        if (!this.isValid) return;

        // ОПТИМИЗАЦИЯ: Вместо объекта counts используем переменные
        let livingBlue = 0;
        let livingRed = 0;
        let livingGreen = 0;
        let livingPurple = 0;
        
        // Проход по предрасчитанным соседям
        // Используем for loop для скорости (быстрее чем for..of в некоторых движках, но for..of читаемее)
        const neighbors = this.neighbors;
        const len = neighbors.length;
        for (let i = 0; i < len; i++) {
            const n = neighbors[i];
            if (n.isAlive) {
                // Сила соседа = его возраст
                const val = n.age;
                // switch быстрее доступа к объекту по ключу
                switch (n.tribe) {
                    case 0: livingBlue += val; break;
                    case 1: livingRed += val; break;
                    case 2: livingGreen += val; break;
                    case 3: livingPurple += val; break;
                }
            }
        }

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
                this.nextAlive = -1; // Маркер умирания
                this.nextTribe = this.tribe;
                this.nextAge = this.age; 
            } else {
                this.nextAlive = 1;
                this.nextTribe = this.tribe;
                this.nextAge = this.age + 1; // Старение
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
                this.nextAlive = 1;
                this.nextTribe = newTribe;
                this.nextAge = 1; // Новорожденный
            } else {
                this.nextAlive = 0;
                this.nextAge = 0;
            }
        }
    }

    // Применение следующего состояния
    applyNextState() {
        if (!this.isValid) return;

        // Обработка умирания (плавное затухание возраста)
        if (this.nextAlive === -1) {
            if (this.tribe === 3) this.age -= 3;
            else this.age -= 4;
            
            if (this.age <= 0) {
                this.isAlive = 0;
                this.age = 0;
            } else {
                this.isAlive = 1; // Все еще виден, но угасает
            }
        } else {
            this.isAlive = this.nextAlive;
            this.tribe = this.nextTribe;
            this.age = this.nextAge;
        }

        if (this.age > 20) this.age = 20; // Cap age
    }
}