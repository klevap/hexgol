const Config = {
    // Восстановленные настройки для инициализации main.js
    DEFAULT_SIZE: 53,
    DEFAULT_BG_COLOR: '#000000',
    DEFAULT_OUTLINE_COLOR: '#333333',

    MAX_AGE: 20,
    
    // Структура весов: [Blue, Red, Green, Purple, SpecialSum]
    // Структура правил:
    // (Rule1 AND Rule2) OR (Rule3 AND Rule4)
    
    TRIBES: [
        {
            id: 0,
            name: "Blue",
            color: [0, 50, 255],
            priority: 2,
            decay: 4,

            // Выживание: (Blue >= 7 И Blue + 2*Red <= 29) ИЛИ (Невозможно)
            survival: {
                group1: [
                    { weights: [1, 0, 0, 0, 0], min: 7, max: 9999 },      // Blue >= 7
                    { weights: [1, 2, 0, 0, 0], min: -9999, max: 29 }     // Blue + 2*Red <= 29
                ],
                group2: [
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 },  // Impossible
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 }   // Impossible
                ]
            },

            // Рождение: (Blue [20,22] И Red [0,19]) ИЛИ (Blue [20,22] И Red [21,999])
            // Оригинал: Blue [20,22] И Red != 20
            birth: {
                group1: [
                    { weights: [1, 0, 0, 0, 0], min: 20, max: 22 },       // Blue [20, 22]
                    { weights: [0, 1, 0, 0, 0], min: 0, max: 19 }         // Red < 20
                ],
                group2: [
                    { weights: [1, 0, 0, 0, 0], min: 20, max: 22 },       // Blue [20, 22]
                    { weights: [0, 1, 0, 0, 0], min: 21, max: 9999 }      // Red > 20
                ]
            }
        },
        {
            id: 1,
            name: "Red",
            color: [255, 0, 0],
            priority: 1,
            decay: 4,

            // Выживание: (Red >= 11 И Blue + Red <= 37)
            survival: {
                group1: [
                    { weights: [0, 1, 0, 0, 0], min: 11, max: 9999 },     // Red >= 11
                    { weights: [1, 1, 0, 0, 0], min: -9999, max: 37 }     // Blue + Red <= 37
                ],
                group2: [
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 },
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 }
                ]
            },

            // Рождение: (Red == 20 И Blue [0,19]) ИЛИ (Red == 20 И Blue [23,999])
            // Оригинал: Red == 20 И НЕ (Blue [20,22])
            birth: {
                group1: [
                    { weights: [0, 1, 0, 0, 0], min: 20, max: 20 },       // Red == 20
                    { weights: [1, 0, 0, 0, 0], min: 0, max: 19 }         // Blue < 20
                ],
                group2: [
                    { weights: [0, 1, 0, 0, 0], min: 20, max: 20 },       // Red == 20
                    { weights: [1, 0, 0, 0, 0], min: 23, max: 9999 }      // Blue > 22
                ]
            }
        },
        {
            id: 2,
            name: "Green",
            color: [0, 255, 0],
            priority: 0, // Lowest priority in original logic (complex check)
            decay: 4,

            // Выживание: (Sum >= 22 И Green <= 24)
            survival: {
                group1: [
                    { weights: [1, 1, 1, 0, 0], min: 22, max: 9999 },     // B+R+G >= 22
                    { weights: [0, 0, 1, 0, 0], min: -9999, max: 24 }     // Green <= 24
                ],
                group2: [
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 },
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 }
                ]
            },

            // Рождение: (Green [20,21] И B+R > 14) ИЛИ (Blue [14,19] И Red [14,19])
            birth: {
                group1: [
                    { weights: [0, 0, 1, 0, 0], min: 20, max: 21 },       // Green [20, 21]
                    { weights: [1, 1, 0, 0, 0], min: 15, max: 9999 }      // B+R >= 15
                ],
                group2: [
                    { weights: [1, 0, 0, 0, 0], min: 14, max: 19 },       // Blue [14, 19]
                    { weights: [0, 1, 0, 0, 0], min: 14, max: 19 }        // Red [14, 19]
                ]
            }
        },
        {
            id: 3,
            name: "Purple",
            color: [180, 0, 180],
            priority: 3, // Highest priority
            decay: 3, // Special decay

            // Выживание: (Purple [11, 34])
            survival: {
                group1: [
                    { weights: [0, 0, 0, 1, 0], min: 11, max: 34 },       // Purple [11, 34]
                    { weights: [0, 0, 0, 0, 0], min: -9999, max: 9999 }   // Always True
                ],
                group2: [
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 },
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 }
                ]
            },

            // Рождение: (Purple [21, 23])
            birth: {
                group1: [
                    { weights: [0, 0, 0, 1, 0], min: 21, max: 23 },       // Purple [21, 23]
                    { weights: [0, 0, 0, 0, 0], min: -9999, max: 9999 }   // Always True
                ],
                group2: [
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 },
                    { weights: [0, 0, 0, 0, 0], min: 9999, max: -9999 }
                ]
            }
        }
    ]
};