// To-Do List Application with Local Storage

class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.editingId = null;

        this.initializeElements();
        this.loadFromLocalStorage();
        this.attachEventListeners();
        this.render();
    }

    initializeElements() {
        this.todoInput = document.getElementById('todoInput');
        this.addBtn = document.getElementById('addBtn');
        this.todoList = document.getElementById('todoList');
        this.clearCompletedBtn = document.getElementById('clearCompleted');
        this.clearAllBtn = document.getElementById('clearAll');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.totalCount = document.getElementById('totalCount');
        this.activeCount = document.getElementById('activeCount');
        this.completedCount = document.getElementById('completedCount');
    }

    attachEventListeners() {
        this.addBtn.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });

        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
    }

    addTodo() {
        const text = this.todoInput.value.trim();
        
        if (text === '') {
            alert('Please enter a task!');
            return;
        }

        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            priority: 'medium',
            createdAt: new Date().toLocaleString(),
            dueDate: ''
        };

        this.todos.unshift(todo);
        this.todoInput.value = '';
        this.saveToLocalStorage();
        this.render();
    }

    deleteTodo(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.todos = this.todos.filter(todo => todo.id !== id);
            this.saveToLocalStorage();
            this.render();
        }
    }

    toggleTodo(id) {
        const todo = this.todos.find(todo => todo.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveToLocalStorage();
            this.render();
        }
    }

    editTodo(id) {
        const todo = this.todos.find(todo => todo.id === id);
        if (todo) {
            this.showEditModal(todo);
        }
    }

    showEditModal(todo) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">Edit Task</div>
                <div class="modal-body">
                    <label>Task Description</label>
                    <input type="text" id="editText" value="${todo.text}" />
                    
                    <label>Priority</label>
                    <select id="editPriority">
                        <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                    
                    <label>Due Date</label>
                    <input type="date" id="editDueDate" value="${todo.dueDate}" />
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                    <button class="btn-save" id="saveEditBtn">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('saveEditBtn').addEventListener('click', () => {
            const text = document.getElementById('editText').value.trim();
            const priority = document.getElementById('editPriority').value;
            const dueDate = document.getElementById('editDueDate').value;

            if (text === '') {
                alert('Task description cannot be empty!');
                return;
            }

            todo.text = text;
            todo.priority = priority;
            todo.dueDate = dueDate;

            this.saveToLocalStorage();
            this.render();
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        this.render();
    }

    clearCompleted() {
        if (confirm('Delete all completed tasks?')) {
            this.todos = this.todos.filter(todo => !todo.completed);
            this.saveToLocalStorage();
            this.render();
        }
    }

    clearAll() {
        if (confirm('Delete ALL tasks? This cannot be undone.')) {
            this.todos = [];
            this.saveToLocalStorage();
            this.render();
        }
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            default:
                return this.todos;
        }
    }

    updateStats() {
        const total = this.todos.length;
        const active = this.todos.filter(todo => !todo.completed).length;
        const completed = this.todos.filter(todo => todo.completed).length;

        this.totalCount.textContent = total;
        this.activeCount.textContent = active;
        this.completedCount.textContent = completed;
    }

    render() {
        const filteredTodos = this.getFilteredTodos();

        if (filteredTodos.length === 0) {
            this.todoList.innerHTML = '<p class="empty-state">No tasks found. Add one to get started! 🎯</p>';
        } else {
            this.todoList.innerHTML = filteredTodos.map(todo => `
                <div class="todo-item ${todo.completed ? 'completed' : ''}">
                    <input 
                        type="checkbox" 
                        class="todo-checkbox" 
                        ${todo.completed ? 'checked' : ''}
                        onchange="app.toggleTodo(${todo.id})"
                    />
                    <div style="flex: 1;">
                        <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                        ${todo.priority ? `<span class="todo-priority priority-${todo.priority}">${todo.priority}</span>` : ''}
                        ${todo.dueDate ? `<div style="font-size: 0.85em; color: #999; margin-top: 5px;">📅 ${todo.dueDate}</div>` : ''}
                    </div>
                    <div class="todo-actions">
                        <button class="edit-btn" onclick="app.editTodo(${todo.id})">Edit</button>
                        <button class="delete-btn" onclick="app.deleteTodo(${todo.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        this.updateStats();
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    saveToLocalStorage() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('todos');
        if (saved) {
            this.todos = JSON.parse(saved);
        }
    }
}

// Initialize the app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
});