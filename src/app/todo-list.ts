import type { TodoItem, TodoList } from "./domian/todo-list.ts"
import { DOMHelper } from "./helper.ts"
import { TodoListRepository } from "./repository/todo-list-repository.ts"

const todoListRepository = new TodoListRepository()

const displayTodoList = async () => {

    DOMHelper.querySelector<HTMLElement>(".todo-container")!.innerHTML = 
    `
    <button class='todo-list-add-button'>Add Todo list</button>
    `

    const todoList = await todoListRepository.findAllTodoLists()

    todoList.forEach(async todoList => {
        const todoCotainer = DOMHelper.querySelector(".todo-container")
        if (!todoCotainer) {
            return
        }

       const todoListElement = renderTodoList(todoList)


       DOMHelper.querySelector(".todo-list-item-add-button", todoListElement)?.addEventListener("click", (event: Event) => {
            const target = event.target as HTMLElement
            if (!target) {
                return
            }
            displayTodoItemForm(todoListElement)
       })

        DOMHelper.querySelector(".todo-list-form-input", todoListElement)?.addEventListener("keydown", (event: Event) => {
            const currentEvent = event as KeyboardEvent
            if (currentEvent.key === "Enter") {
                handleTodoItemSubmit(currentEvent.target as HTMLInputElement)
            }
        })

        DOMHelper.querySelector(".todo-list-add-button", todoCotainer)?.addEventListener("click", (event: Event) => {
            const target = event.target as HTMLElement
            if (!target) {
                return
            }
            handleTodoListAddButtonClick(target as HTMLInputElement)
        })



        todoCotainer.appendChild(todoListElement)

        todoList.todoList.forEach(todoItem => {
            const todoItemElement = renderTodoItem(todoItem)
            DOMHelper.querySelector(".todo-list-form", todoListElement)?.before(todoItemElement)
        })

    })
}

const displayTodoItemForm = (container: HTMLElement) => {
    const form = DOMHelper.querySelector('.todo-list-form', container)
    if (!form) {
        return
    }

    form.style.display = 'block'
}

const hideTodoItemForm = (container: HTMLElement) => {
    const form = DOMHelper.querySelector('.todo-list-form', container)
    if (!form) {
        return
    }
    form.style.display = 'none'
}

const handleTodoItemSubmit = async (inputElement: HTMLInputElement) => {
    // 1. 関連するDOM要素を取得
    const todoListContainer = DOMHelper.closest(inputElement, ".todo-list-container");
    if (!todoListContainer) {
        return;
    }

    // 2. フォームを非表示にし、値をリセット
    hideTodoItemForm(todoListContainer);
    const title = inputElement.value.trim();
    inputElement.value = "";

    // 3. 入力値が空なら何もしない
    if (title === "") {
        return;
    }

    // 4. データを保存
    const listId = Number(todoListContainer.dataset.listId);
    await todoListRepository.createTodoItem(title, listId);

    // 5. 画面全体を再描画（※これは前回のフィードバックで指摘した通り、本当は部分的な更新にしたい部分）
    await displayTodoList();
}

const handleTodoListAddButtonClick = async (inputElement: HTMLInputElement) => {
    const todoListContainer = DOMHelper.closest(inputElement, ".todo-list-container")
    if (!todoListContainer) {
        return
    }
    await todoListRepository.createTodoList(inputElement.value, 0)
    await displayTodoList()
}

const renderTodoList = (todoList: TodoList): HTMLElement => {
    const todoListElement = document.createElement("div")
    todoListElement.innerHTML = `
        <div class="todo-list-container" data-list-id="${todoList.id}">
            <div class="todo-list-form" style="display: none;">
                <input type="text" class="todo-list-form-input" id="todo-list-form-input-${todoList.id}">
            </div>
            <button class="todo-list-item-add-button">Add</button>
        </div>
    `
    return todoListElement.firstElementChild as HTMLElement
}

const renderTodoItem = (todoItem: TodoItem): HTMLElement => {

    if (!todoItem.id) {
        throw new Error("Todo item id is required for renderTodoItem")
    }

    // todo item htmlを生成（すべてHTML文字列で値を埋め込む形式）
    const todoItemElement = document.createElement("div")
    todoItemElement.innerHTML = `
        <div 
            class="todo-list-item" 
            data-item-id="${todoItem.id}" 
            id="todo-list-item-${todoItem.id}">
            <input type="checkbox" ${todoItem.isDone ? "checked" : ""}>
            <span>${todoItem.title}</span>
            <span>${todoItem.time}</span>
        </div>
    `;
    // div.todo-list-item自体を返すため、中の要素を取得して返す
    const innerElement = todoItemElement.firstElementChild as HTMLElement

    return innerElement
}


await displayTodoList()

