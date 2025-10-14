import type { TodoList } from "./domian/todo-list.ts"
import { DOMHelper } from "./helper.ts"
import { TodoListRepository } from "./repository/todo-list-repository.ts"
import { renderTodoContainer, renderTodoItem, renderTodoList } from "./view/todo-list.ts"

const todoListRepository = new TodoListRepository()

const displayTodoList = async () => {

    const todoCotainer = renderTodoContainer()

    DOMHelper.querySelector(".todo-list-add-button", todoCotainer)?.addEventListener("click", handleTodoListAdd)

    const todo : TodoList[] = await todoListRepository.findAllTodoLists()
    // positionでソート
    todo.sort((todoListA, todoListB) => todoListA.position - todoListB.position)
    todo.forEach(async todoList => {
       const todoListElement = renderTodoList(todoList)

        todoCotainer.appendChild(todoListElement)

        // positionでソート
        todoList.todoList.sort((todoItemA, todoItemB) => todoItemA.position - todoItemB.position)
        todoList.todoList.forEach(todoItem => {
            const todoItemElement = renderTodoItem(todoItem)
            DOMHelper.querySelector(".todo-list-form", todoListElement)?.before(todoItemElement)

        })

       await registerTodoListEvent(todoListElement)


    })
}

const handleTodoItemForm = (event: Event) => {
    const target = event.target
    if (!target) {
        return
    }
    const todoListContainer = DOMHelper.closest(target as HTMLElement, ".todo-list-container")
    if (!todoListContainer) {
        return
    }

    const form = DOMHelper.querySelector('.todo-list-form', todoListContainer)
    if (!form) {
        return
    }

    form.style.display = 'block'
}

const handleTodoItemAdd = async (event: KeyboardEvent) => {
    if (event.key !== "Enter") {
        return
    }

    const target = event.target 
    if (!target) {
        return
    }

    const inputElement = target as HTMLInputElement
    const todoListContainer = DOMHelper.closest(inputElement, ".todo-list-container");
    if (!todoListContainer) {
        return;
    }

    const title = inputElement.value.trim();
    if (title === "") {
        return;
    }

    const listId = Number(todoListContainer.dataset.listId);
    await todoListRepository.createTodoItem(title, listId);

    await displayTodoList();
}

const handleTodoListAdd = async (event: Event) => {
    const target = event.target
    if (!target) {
        return
    }
    const inputElement = target as HTMLInputElement
    const todoContainer = DOMHelper.closest(inputElement, ".todo-container")
    if (!todoContainer) {
        return
    }

    await todoListRepository.createTodoList(inputElement.value)
    await displayTodoList()
}

const handleTodoItemDone = async (event: Event) => {
    const target = event.target
    if (!target) {
        return
    }
    const todoItem = DOMHelper.closest(target as HTMLElement, ".todo-list-item")
    const todoListContainer = DOMHelper.closest(todoItem as HTMLElement, ".todo-list-container")
    if (!todoItem || !todoListContainer) {
        return
    }

    if (!todoItem.dataset.position) {
        console.error("Todo item id is not found")
        return
    }

    const todoItemPosition = Number(todoItem.dataset.position)
    const todoListId = Number(todoListContainer.dataset.listId)

    const todoList = await todoListRepository.findTodoListById(todoListId)
    if (!todoList) {
        console.error("Todo list is not found")
        return
    }


    todoList.toggle(todoItemPosition)

    await todoListRepository.saveAllTodoItems(todoList.todoList)
    await displayTodoList()

}



const registerTodoListEvent = async (todoListElement: HTMLElement) => {

    DOMHelper.querySelector(".todo-list-item-add-button", todoListElement)?.addEventListener("click", handleTodoItemForm)

    DOMHelper.querySelector(".todo-list-form-input", todoListElement)?.addEventListener("keydown", handleTodoItemAdd)

    DOMHelper.querySelectorAll(".todo-list-item", todoListElement)?.forEach(todoItemElement => {
        todoItemElement.addEventListener("click", handleTodoItemDone)
    })

}




await displayTodoList()

