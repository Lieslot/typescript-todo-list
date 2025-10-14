import { Dexie, type Table } from "dexie";
import { TodoItem, TodoList } from "../domian/todo-list.ts";

export class TodoListRepository extends Dexie {
    todoLists!: Table<TodoList, number>
    todoItems!: Table<TodoItem, number>

    constructor() {
        super("todoListRepository")
        this.version(1).stores({
            todoLists: "++id, name, position",
            todoItems: "++id, title, time, createdAt, updatedAt, isDone, listId"
        })
    }


    public async findAllTodoLists() {
        const todoListsData = await this.todoLists.toArray()
        const todoItemsData = await this.todoItems.toArray()

        // プレーンオブジェクトをクラスインスタンスに変換
        const todoLists = todoListsData.map(data => new TodoList(data))

        const todoItems = todoItemsData.map(data => new TodoItem(data))

        todoLists.forEach(todoList => {
            todoList.addAllTodoItem(todoItems.filter(todoItem => todoItem.listId === todoList.id))
        })

        return todoLists
    }

    public async findAllTodoItems() {
        const todoItemsData = await this.todoItems.toArray()
        return todoItemsData.map(data => new TodoItem(data))
    }

    public async findTodoListById(id: number) {
        const todoListData = await this.todoLists.get(id)
        if (!todoListData) return undefined

        const todoList = new TodoList(todoListData)
        if (!todoList) return undefined

        const todoItemData = await this.findTodoItemsByListId(id)
        if (!todoItemData) return undefined

        const todoItems = todoItemData.map(data => new TodoItem(data))

        todoList.addAllTodoItem(todoItems)
        return todoList
    }

    public async findTodoItemById(id: number) {
        const data = await this.todoItems.get(id)
        if (!data) return undefined
        return new TodoItem(data)
    }

    public async findTodoItemsByListId(listId: number) : Promise<TodoItem[]> {
        const todoItemsData = await this.todoItems.where("listId").equals(listId).toArray()
        return todoItemsData.map(data => new TodoItem(data))
    }

    public async createTodoList(name: string) : Promise<TodoList | undefined> {
        const position = await this.todoLists.count()
        const todoList = new TodoList({
            name,
            position,
        })
        const id = await this.todoLists.add(todoList)
        return await this.todoLists.get(id)
    }

    public async createTodoItem(title: string, listId: number) : Promise<TodoItem | undefined> {
        // positionはlistIdのtodoItemsの数
        const position = await this.todoItems.where("listId").equals(listId).count()
        const todoItem = new TodoItem({
            title,
            createdAt: new Date(),
            updatedAt: null,
            isDone: false,
            listId,
            position,
        })

       const id = await this.todoItems.add(todoItem)

       return await this.todoItems.get(id)
    }

    public async saveTodoList(todoList: TodoList) {
        return await this.todoLists.put(todoList)
    }

    // bulkUpdateのkeyにはundefinedが許容されていないため、idがundefinedでないものだけを対象にする
    public async saveAllTodoItems(todoItems: TodoItem[]) {
        return await this.todoItems.bulkPut(todoItems)
    }

    public async saveTodoItem(todoItem: TodoItem) {
        return await this.todoItems.put(todoItem)
    }


}