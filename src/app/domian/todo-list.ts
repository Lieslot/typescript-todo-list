
interface TodoListParams {
    id?: number | undefined
    name: string
    position: number
}

interface TodoItemParams {
    id?: number | undefined
    title: string
    createdAt: Date
    updatedAt: Date | null
    isDone: boolean
    listId: number
    position: number
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

    private take(todoItem: TodoItem) {
        todoItem.listId = this.id!
    }

    private shiftPosition() {
        for (let i = 0; i < this.todoList.length; i++) {
            this.todoList[i]!.position = i
        }
    }

    public insert(todoItem: TodoItem, position: number) {
        this.take(todoItem)
        this.todoList.splice(position, 0, todoItem)
        todoItem.position = position
        this.shiftPosition()
    }

    public push(todoItem: TodoItem) {
        this.take(todoItem)
        this.todoList.push(todoItem)
        this.shiftPosition()
        
    }

    public pushAll(todoItems: TodoItem[]) {
        todoItems.forEach(todoItem => {
            this.take(todoItem)
        })
        this.todoList.push(...todoItems)
        this.shiftPosition()
    }

    public sortTodoItemByPosition() {
        this.todoList.sort((a, b) => a.position - b.position)
    }

    public toggle(position: number) {
        const todoItem = this.todoList.find(todoItem => todoItem.position === position)
        if (!todoItem) {
            return
        }

        todoItem.toggle()
    }
}

class TodoItem {

    title: string
    id?: number | undefined
    createdAt: Date
    updatedAt: Date | null
    isDone: boolean
    listId: number
    position: number

    constructor({
        id,
        title,
        createdAt,
        updatedAt,
        isDone,
        listId,
        position
    }: TodoItemParams) {
        this.title = title
        this.id = id
        this.createdAt = createdAt
        this.updatedAt = updatedAt
        this.isDone = isDone
        this.listId = listId
        this.position = position
    }

    static create(params: TodoItemParams) : TodoItem {
        return new TodoItem(params)
    }

    public toggle() {
        this.isDone = !this.isDone
    }

}

export { TodoList, TodoItem }
