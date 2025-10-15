import type { TodoList } from "./domian/todo-list.ts"
import { DOMHelper } from "./helper.ts"
import { TodoListRepository } from "./repository/todo-list-repository.ts"
import { renderDragIndicator, renderTodoContainer, renderTodoItem, renderTodoList } from "./view/todo-list.ts"

const todoListRepository = new TodoListRepository()
let curDraggedItemClone: HTMLElement | null = null;
let curDraggedItem: HTMLElement | null = null;
let curContainer: HTMLElement | null = null;
let curDragIndicator: HTMLElement | null = null;

const handleDragStart = (event: MouseEvent) => {

    const target = (event.target as HTMLElement).closest(".todo-list-item")
    
    if (!target) {
        return
    }


    curDraggedItemClone = target.cloneNode(true) as HTMLElement
    curDraggedItem = target as HTMLElement

    curDraggedItemClone.style.left = event.clientX + "px"
    curDraggedItemClone.style.top = event.clientY + "px"
    curDraggedItemClone.style.position = 'fixed';
    curDraggedItemClone.style.opacity = '0.5';
    curDraggedItemClone.style.pointerEvents = 'none';
    curDraggedItemClone.style.zIndex = '9999';
    document.body.appendChild(curDraggedItemClone);

    // 元の要素を薄くする
    curDraggedItem.style.opacity = '0.3';

};


const handleDragOver = (event: MouseEvent) => {
    event.preventDefault();
    if (!curDraggedItemClone) {
        return
    }
    
    curDraggedItemClone.style.left = event.clientX + "px"
    curDraggedItemClone.style.top = event.clientY + "px"

};

const handleDrop = async (event: MouseEvent) => {

    if (!curDraggedItemClone || !curDraggedItem) {
        return
    }
    
    // fixme: containerの内部の要素がない場合も考慮
    if (curDragIndicator) {
        const targetItemElement = curDragIndicator.previousElementSibling as HTMLElement

        const targetItemId = targetItemElement ? Number(targetItemElement.dataset.itemId) : 0
        const draggedItemId = Number(curDraggedItem?.dataset.itemId)
        const todoListId = Number(curContainer?.dataset.listId)

        const targetTodoList = await todoListRepository.findTodoListById(todoListId)
        const draggedTodoItem = await todoListRepository.findTodoItemById(draggedItemId)
        const targetTodoItem = await todoListRepository.findTodoItemById(targetItemId)


        if (targetTodoList?.todoList.length === 0) {
            targetTodoList.push(draggedTodoItem!)
            await todoListRepository.saveAllTodoItems(targetTodoList.todoList)
        } else {
            targetTodoList?.insert(draggedTodoItem!, targetTodoItem!.position)
            await todoListRepository.saveAllTodoItems(targetTodoList!.todoList)
        }

        curDragIndicator.remove()
        curDragIndicator = null
        
    }
    
    curDraggedItemClone.remove()
    curDraggedItemClone = null

    curDraggedItem.style.opacity = '1'
    curDraggedItem = null

    curContainer = null
    

    await displayTodoList()

}


const handleContainerDragOver = (event: MouseEvent) => {

    if (!curDraggedItemClone) {
        return
    }

    const container = DOMHelper.closest(event.target as HTMLElement, ".todo-list-container")
    if (!container) {
        return
    }

    curContainer = container

    // 既存のインジケーターを削除
    if (curDragIndicator) {
        curDragIndicator.remove();
    }

    // containerの内部位置を計算して、一番近い要素を取得
    const items = DOMHelper.querySelectorAll(".todo-list-item", container)
    const newIndicator = renderDragIndicator();

    if (items.length === 0) {
        // アイテムがなければコンテナの末尾に追加
        container.firstElementChild?.before(newIndicator);
        curDragIndicator = newIndicator;
        return;
    }
    
    const closestItem = items.reduce((prev, current) => {
        const prevRect = prev.getBoundingClientRect()
        const currentRect = current.getBoundingClientRect()
        return Math.abs(currentRect.top - event.clientY) < Math.abs(prevRect.top - event.clientY) ? current : prev
    })
    
    const rect = closestItem.getBoundingClientRect()
    const midPoint = rect.top + rect.height / 2

    if (event.clientY < midPoint) {
        closestItem.before(newIndicator)
    } else {
        closestItem.after(newIndicator)
    }
    curDragIndicator = newIndicator;
}

const handleContainerDragLeave = (event: MouseEvent) => {

    curContainer = null
    if (!curDragIndicator) {
        return
    }
    curDragIndicator.remove()

    curDragIndicator = null
};



const displayTodoList = async () => {

    const todoCotainer = renderTodoContainer()

    DOMHelper.querySelector(".todo-list-add-button", todoCotainer)?.addEventListener("click", handleTodoListAdd)

    const todo : TodoList[] = await todoListRepository.findAllTodoLists()
    // positionでソート
    todo.sort((todoListA, todoListB) => todoListA.position - todoListB.position)
    todo.forEach(async todoList => {
       const todoListElement = renderTodoList(todoList)

        todoCotainer.appendChild(todoListElement)

        todoListElement.addEventListener("mouseover", handleContainerDragOver)
        todoListElement.addEventListener("mouseleave", handleContainerDragLeave)

        // positionでソート
        todoList.todoList.sort((todoItemA, todoItemB) => todoItemA.position - todoItemB.position)
        todoList.todoList.forEach(todoItem => {
            const todoItemElement = renderTodoItem(todoItem)

            todoItemElement.addEventListener("mousedown", handleDragStart)

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

document.addEventListener("mouseover", handleDragOver)
document.addEventListener("mouseup", handleDrop) 


await displayTodoList()

