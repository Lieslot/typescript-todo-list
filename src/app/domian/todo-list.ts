
interface TodoListParams {
    id?: number | undefined
    name: string
    position: number
}

interface TodoItemParams {
    id?: number | undefined
    title: string
    time: number
    createdAt: Date
    updatedAt: Date | null
    isDone: boolean
    listId: number
}


class TodoList {
    todoList: TodoItem[] = []
    id?: number | undefined
    name: string
    position: number

    constructor({
        id,
        name,
        position
    }: TodoListParams) {
        this.id = id
        this.name = name
        this.position = position
        this.todoList = []
    }

    public addTodoItem(todoItem: TodoItem) {
        this.todoList.push(todoItem)
    }

    public addAllTodoItem(todoItems: TodoItem[]) {
        this.todoList.push(...todoItems)
    }
}

class TodoItem {
    title: string
    time: number
    id?: number | undefined
    createdAt: Date
    updatedAt: Date | null
    isDone: boolean
    listId: number

    constructor({
        id,
        title,
        time,
        createdAt,
        updatedAt,
        isDone,
        listId
    }: TodoItemParams) {
        this.title = title
        this.time = time
        this.id = id
        this.createdAt = createdAt
        this.updatedAt = updatedAt
        this.isDone = isDone
        this.listId = listId
    }

    static create(params: TodoItemParams) : TodoItem {
        return new TodoItem(params)
    }

}

export { TodoList, TodoItem }
