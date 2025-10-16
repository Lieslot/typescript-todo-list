import { movePosition, type TodoList } from "./domian/todo-list.ts"
import { DOMHelper } from "./helper.ts"
import { TodoListRepository } from "./repository/todo-list-repository.ts"
import { renderCloneTodoItem, renderDragIndicator, renderTodoContainer, renderTodoItem, renderTodoList } from "./view/todo-list.ts"
import lodash from "lodash"

const todoListRepository = new TodoListRepository()
let curDraggedItem: HTMLElement | null = null;
let curContainer: HTMLElement | null = null;
let curDragIndicator: HTMLElement | null = null;
const handleDragStart = (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest(".todo-list-item") as HTMLElement
    
    if (!target) {
        return
    }

    curDraggedItem = target as HTMLElement
    // 元の要素を薄くする

};



const handleDrop = async (event: MouseEvent) => {
    event.preventDefault();
    // 必須情報がそもそも欠けていたら全解放して終了
    if (!curDraggedItem) {
        freeAllDragElements();
        return;
    }

    // ドロップ操作のコンテキストをまとめて得る
    const context = {
        draggedItemId: curDraggedItem?.dataset.itemId ? Number(curDraggedItem.dataset.itemId) : null,
        targetListId: curContainer?.dataset.listId ? Number(curContainer.dataset.listId) : null,
        indicator: curDragIndicator,
        container: curContainer,
        draggedElement: curDraggedItem
    };

    if (!context.indicator || context.draggedItemId == null || context.targetListId == null) {
        freeAllDragElements();
        return;
    }

    // nextElementSiblingとして次のtodoアイテムを得る（インジケーターの直後）
    const nextItemElem = context.indicator.nextElementSibling as HTMLElement | null;

    // 移動元と挿入候補が同じなら何もしない
    if (context.draggedElement === nextItemElem) {
        freeAllDragElements();
        return;
    }

    // .todo-list-itemならそこのitemIdを、なければnull（= 末尾）
    const targetItemId = nextItemElem?.classList.contains('todo-list-item')
        ? Number(nextItemElem.dataset.itemId)
        : null;

    // 実際のロジックをまとめて実行
    await movePosition(context.draggedItemId, targetItemId, context.targetListId);

    freeAllDragElements();
    await displayTodoList();
}

const freeAllDragElements = () => {
    if (!curDraggedItem) {
        return;
    }

    if (curDraggedItem) {
        curDraggedItem = null;
    }
    curContainer = null;
    if (curDragIndicator) {
        curDragIndicator.remove();
        curDragIndicator = null;
    }
}


const handleContainerDragOver = (event: MouseEvent) => {
    event.preventDefault();
    if (!curDraggedItem) {
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
    const todoContainer = renderTodoContainer();
    DOMHelper.querySelector(".todo-list-add-button", todoContainer)?.addEventListener("click", handleTodoListAdd);

    const todoLists: TodoList[] = await todoListRepository.findAllTodoLists();

    todoLists.forEach(async todoList => {
        const todoListElement = renderTodoList(todoList);
        todoContainer.appendChild(todoListElement);

        todoListElement.addEventListener("dragover", lodash.throttle(handleContainerDragOver, 10));
        todoListElement.addEventListener("dragleave", handleContainerDragLeave);

        // 連結リストを直接ループ
        for (const todoItem of todoList) {
            const todoItemElement = renderTodoItem(todoItem);
            todoItemElement.addEventListener("dragstart", handleDragStart);
            DOMHelper.querySelector(".todo-list-form", todoListElement)?.before(todoItemElement);
        }

        await registerTodoListEvent(todoListElement);
    });

    // 古い要素を削除して新しいtodoContainerをbodyに追加
    const oldContainer = document.querySelector(".todo-container");
    if (oldContainer) {
        oldContainer.replaceWith(todoContainer);
    } else {
        document.body.appendChild(todoContainer);
    }
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
    const target = event.target;
    if (!target) return;

    const todoItemElement = DOMHelper.closest(target as HTMLElement, ".todo-list-item");
    if (!todoItemElement) return;

    const todoItemId = Number(todoItemElement.dataset.itemId);
    if (!todoItemId) {
        console.error("Todo item id is not found");
        return;
    }

    const todoItem = await todoListRepository.findTodoItemById(todoItemId);
    if (!todoItem) {
        console.error("Todo item is not found in repository");
        return;
    }
    
    // アイテムのisDoneをトグルし、DBに保存
    todoItem.toggle();
    await todoListRepository.saveTodoItem(todoItem);

    // UIを再描画
    await displayTodoList();
}



const registerTodoListEvent = async (todoListElement: HTMLElement) => {

    DOMHelper.querySelector(".todo-list-item-add-button", todoListElement)?.addEventListener("click", handleTodoItemForm)

    DOMHelper.querySelector(".todo-list-form-input", todoListElement)?.addEventListener("keydown", handleTodoItemAdd)

    DOMHelper.querySelectorAll(".todo-list-item", todoListElement)?.forEach(todoItemElement => {
        todoItemElement.addEventListener("click", handleTodoItemDone)
    })

}



document.addEventListener("drop", handleDrop) 
document.addEventListener("dragover", (event) => event.preventDefault())

await displayTodoList()


export { todoListRepository }