import type { TodoItem, TodoList } from "../domian/todo-list.ts"
import { DOMHelper } from "../helper.ts"



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
            data-position="${todoItem.position}"
            id="todo-list-item-${todoItem.id}">
            <input type="checkbox" ${todoItem.isDone ? "checked" : ""}>
            <span>${todoItem.title}</span>
        </div>
    `;
    // div.todo-list-item自体を返すため、中の要素を取得して返す
    const innerElement = todoItemElement.firstElementChild as HTMLElement

    return innerElement
}


const renderTodoContainer = (): HTMLElement => {
    const todoCotainer = DOMHelper.querySelector(".todo-container")

    if (!todoCotainer) {
        throw new Error("Todo container not found")
    }

    todoCotainer!.innerHTML = 
    `
    <button class='todo-list-add-button'>Add Todo list</button>
    `

    return todoCotainer

}

const renderDragIndicator = () : HTMLElement => {
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    indicator.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #2196F3;
      pointer-events: none;
      z-index: 1000;
    `;
    return indicator;

}


export { renderTodoList, renderTodoItem, renderTodoContainer, renderDragIndicator }