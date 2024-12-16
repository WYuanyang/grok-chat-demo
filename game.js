class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 600;
        this.canvas.height = 400;
        
        this.gridSize = 20;
        this.snake = [{x: 5, y: 5}];
        this.direction = 'right';
        this.food = this.generateFood();
        this.score = 0;
        this.level = 1;
        this.gameSpeed = 150;
        this.gameLoop = null;
        this.isPaused = false;
        
        // 特殊食物类型
        this.specialFoodTypes = [
            {type: 'speed', color: '#FFD700', icon: '⚡', effect: () => this.speedBoost()},
            {type: 'points', color: '#FF1493', icon: '★', effect: () => this.addExtraPoints()},
            {type: 'shrink', color: '#4169E1', icon: '✂', effect: () => this.shrinkSnake()}
        ];

        this.setupEventListeners();
        this.showStartScreen();
        this.setupHelpPanel();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
    }

    handleKeyPress(e) {
        const keys = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };

        if (keys[e.key]) {
            const newDirection = keys[e.key];
            const opposites = {
                'up': 'down',
                'down': 'up',
                'left': 'right',
                'right': 'left'
            };

            if (this.direction !== opposites[newDirection]) {
                this.direction = newDirection;
            }
        }
    }

    generateFood() {
        const x = Math.floor(Math.random() * (this.canvas.width / this.gridSize));
        const y = Math.floor(Math.random() * (this.canvas.height / this.gridSize));
        return {x, y};
    }

    generateSpecialFood() {
        if (Math.random() < 0.2 && !this.specialFood) {
            const type = this.specialFoodTypes[Math.floor(Math.random() * this.specialFoodTypes.length)];
            this.specialFood = {
                ...this.generateFood(),
                ...type
            };
        }
    }

    speedBoost() {
        const originalSpeed = this.gameSpeed;
        this.gameSpeed = this.gameSpeed / 2;
        setTimeout(() => {
            this.gameSpeed = originalSpeed;
        }, 5000);
    }

    addExtraPoints() {
        this.score += 50;
        this.updateScore();
    }

    shrinkSnake() {
        if (this.snake.length > 3) {
            this.snake = this.snake.slice(0, this.snake.length - 2);
        }
    }

    moveSnake() {
        const head = {...this.snake[0]};

        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 穿墙
        head.x = (head.x + this.canvas.width / this.gridSize) % (this.canvas.width / this.gridSize);
        head.y = (head.y + this.canvas.height / this.gridSize) % (this.canvas.height / this.gridSize);

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.food = this.generateFood();
            this.generateSpecialFood();
            this.checkLevelUp();
        } else if (this.specialFood && head.x === this.specialFood.x && head.y === this.specialFood.y) {
            this.specialFood.effect();
            this.specialFood = null;
        } else {
            this.snake.pop();
        }

        // 碰撞检测
        if (this.checkCollision()) {
            this.gameOver();
        }
    }

    checkCollision() {
        const head = this.snake[0];
        return this.snake.slice(1).some(segment => 
            segment.x === head.x && segment.y === head.y
        );
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制蛇
        this.snake.forEach((segment, index) => {
            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#45a049');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 2,
                this.gridSize - 2
            );
        });

        // 绘制普通食物
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(
            (this.food.x * this.gridSize) + this.gridSize/2,
            (this.food.y * this.gridSize) + this.gridSize/2,
            this.gridSize/2 - 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // 绘制特殊食物
        if (this.specialFood) {
            // 绘制食物圆点
            this.ctx.fillStyle = this.specialFood.color;
            this.ctx.beginPath();
            this.ctx.arc(
                (this.specialFood.x * this.gridSize) + this.gridSize/2,
                (this.specialFood.y * this.gridSize) + this.gridSize/2,
                this.gridSize/2 - 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            
            // 绘制功能图标
            this.ctx.fillStyle = 'white';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                this.specialFood.icon,
                (this.specialFood.x * this.gridSize) + this.gridSize/2,
                (this.specialFood.y * this.gridSize) + this.gridSize/2
            );
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
    }

    checkLevelUp() {
        if (this.score > this.level * 100) {
            this.level++;
            document.getElementById('level').textContent = this.level;
            this.gameSpeed = Math.max(50, this.gameSpeed - 10);
            this.showLevelUpMessage();
        }
    }

    showLevelUpMessage() {
        const message = document.createElement('div');
        message.textContent = `升级到 ${this.level} 级！`;
        message.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            animation: fadeOut 2s forwards;
        `;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 2000);
    }

    showStartScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('按开始按钮开始游戏', this.canvas.width/2, this.canvas.height/2);
    }

    startGame() {
        if (this.gameLoop) return;
        
        this.snake = [{x: 5, y: 5}];
        this.direction = 'right';
        this.score = 0;
        this.level = 1;
        this.gameSpeed = 150;
        this.updateScore();
        document.getElementById('level').textContent = this.level;
        
        this.gameLoop = setInterval(() => {
            if (!this.isPaused) {
                this.moveSnake();
                this.draw();
            }
        }, this.gameSpeed);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? '继续' : '暂停';
    }

    gameOver() {
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`游戏结束! 得分: ${this.score}`, this.canvas.width/2, this.canvas.height/2);
    }

    setupHelpPanel() {
        const helpBtn = document.getElementById('helpBtn');
        const helpPanel = document.querySelector('.help-panel');
        const closeBtn = document.querySelector('.close-btn');

        helpBtn.addEventListener('click', () => {
            helpPanel.classList.add('active');
        });

        closeBtn.addEventListener('click', () => {
            helpPanel.classList.remove('active');
        });

        // 点击面板外关闭
        document.addEventListener('click', (e) => {
            if (e.target === helpPanel) {
                helpPanel.classList.remove('active');
            }
        });
    }
}

// 初始化游戏
const game = new SnakeGame(); 