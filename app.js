// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker registrado'))
            .catch(() => console.log('Service Worker não registrado'));
    });
}

// Dados do Sistema (Leveling + Tasks)
let systemData = {
    level: 1,
    xp: 0,
    maxXp: 100,
    attributes: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        vitality: 10
    },
    tasks: [],
    totalPoints: 0
};

// Elementos do DOM
const playerLevel = document.getElementById('playerLevel');
const playerRank = document.getElementById('playerRank');
const xpBar = document.getElementById('xpBar');
const xpText = document.getElementById('xpText');
const attrStr = document.getElementById('attrStr');
const attrAgi = document.getElementById('attrAgi');
const attrInt = document.getElementById('attrInt');
const attrVit = document.getElementById('attrVit');

const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const tasksList = document.getElementById('tasksList');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');

const totalTasks = document.getElementById('totalTasks');
const activeTasks = document.getElementById('activeTasks');
const completedTasks = document.getElementById('completedTasks');

const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');
const installBtn = document.getElementById('installBtn');

let currentFilter = 'all';
let deferredPrompt;

// --- Lógica de Leveling ---

function getRank(level) {
    if (level < 10) return 'E-Rank';
    if (level < 20) return 'D-Rank';
    if (level < 35) return 'C-Rank';
    if (level < 50) return 'B-Rank';
    if (level < 70) return 'A-Rank';
    return 'S-Rank';
}

function addXP(amount) {
    systemData.xp += amount;
    systemData.totalPoints += amount;

    while (systemData.xp >= systemData.maxXp) {
        systemData.xp -= systemData.maxXp;
        levelUp();
    }

    saveData();
    updateUI();
}

function levelUp() {
    systemData.level++;
    systemData.maxXp = Math.floor(systemData.maxXp * 1.1);

    // Aumentar atributos
    const bonus = 2;
    systemData.attributes.strength += bonus;
    systemData.attributes.agility += bonus;
    systemData.attributes.intelligence += bonus;
    systemData.attributes.vitality += bonus;

    saveData();
    showLevelUpNotification();
}

function showLevelUpNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: white;
        padding: 2rem;
        border-radius: 1rem;
        font-size: 1.5rem;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
        animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    notification.innerHTML = `⭐ LEVEL UP! Nível ${systemData.level}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 2500);
}

// --- Lógica de Tasks ---

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    const task = {
        id: Date.now(),
        text,
        completed: false,
        xpReward: 10
    };

    systemData.tasks.unshift(task);
    taskInput.value = '';
    saveData();
    renderTasks();
    updateUI();
}

function deleteTask(id) {
    systemData.tasks = systemData.tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    updateUI();
}

function toggleTask(id) {
    const task = systemData.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            addXP(task.xpReward);
        } else {
            systemData.xp -= task.xpReward;
            if (systemData.xp < 0) systemData.xp = 0;
        }
        saveData();
        renderTasks();
        updateUI();
    }
}

function clearCompleted() {
    systemData.tasks = systemData.tasks.filter(t => !t.completed);
    saveData();
    renderTasks();
    updateUI();
}

// --- Lógica de Dados ---

function loadData() {
    const saved = localStorage.getItem('levelUpSystemV2');
    if (saved) {
        systemData = JSON.parse(saved);
    }
}

function saveData() {
    localStorage.setItem('levelUpSystemV2', JSON.stringify(systemData));
}

function exportData() {
    const dataStr = JSON.stringify(systemData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `level-up-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function resetProgress() {
    if (confirm('Deseja resetar todo o seu progresso de caçador?')) {
        systemData = {
            level: 1,
            xp: 0,
            maxXp: 100,
            attributes: {
                strength: 10,
                agility: 10,
                intelligence: 10,
                vitality: 10
            },
            tasks: [],
            totalPoints: 0
        };
        saveData();
        renderTasks();
        updateUI();
    }
}

// --- UI ---

function renderTasks() {
    tasksList.innerHTML = '';
    
    const filteredTasks = systemData.tasks.filter(task => {
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });

    if (filteredTasks.length === 0) {
        emptyState.classList.add('show');
    } else {
        emptyState.classList.remove('show');
        filteredTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            item.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <span class="task-xp">+${task.xpReward} XP</span>
                <div class="task-actions">
                    <button class="task-btn delete-btn" title="Excluir">✕</button>
                </div>
            `;

            const checkbox = item.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => toggleTask(task.id));

            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            tasksList.appendChild(item);
        });
    }
}

function updateUI() {
    // Leveling
    playerLevel.textContent = systemData.level;
    playerRank.textContent = getRank(systemData.level);
    
    const xpPercent = (systemData.xp / systemData.maxXp) * 100;
    xpBar.style.width = xpPercent + '%';
    xpText.textContent = `${systemData.xp} / ${systemData.maxXp} XP`;

    // Atributos
    attrStr.textContent = systemData.attributes.strength;
    attrAgi.textContent = systemData.attributes.agility;
    attrInt.textContent = systemData.attributes.intelligence;
    attrVit.textContent = systemData.attributes.vitality;

    // Stats
    totalTasks.textContent = systemData.tasks.length;
    activeTasks.textContent = systemData.tasks.filter(t => !t.completed).length;
    completedTasks.textContent = systemData.tasks.filter(t => t.completed).length;
}

// --- PWA Installation ---

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        // Disparar o prompt nativo imediatamente
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Instalação: ${outcome}`);
        
        if (outcome === 'accepted') {
            installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    } else {
        // Fallback para navegadores que não suportam beforeinstallprompt (como iOS Safari)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            alert('Para instalar no iOS:\n1. Toque no ícone de "Compartilhar" (quadrado com seta)\n2. Role para baixo e toque em "Adicionar à Tela de Início"');
        } else {
            alert('Para instalar:\n1. Clique nos três pontos (menu) do navegador\n2. Selecione "Instalar App" ou "Adicionar à Tela Inicial"');
        }
    }
});

window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    deferredPrompt = null;
});

// --- Event Listeners ---

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

clearBtn.addEventListener('click', clearCompleted);
exportBtn.addEventListener('click', exportData);
resetBtn.addEventListener('click', resetProgress);

// Inicializar
loadData();
updateUI();
renderTasks();
