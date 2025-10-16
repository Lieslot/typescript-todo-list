import { Dexie, type Table } from "dexie";
import { TodoItem, TodoList } from "../domian/todo-list.ts";

export class TodoListRepository extends Dexie {
    todoLists!: Table<TodoList, number>
    todoItems!: Table<TodoItem, number>

    constructor() {
        super("todoListRepository");
        this.version(1).stores({
            todoLists: "++id, name, position",
            todoItems: "++id, title, time, createdAt, updatedAt, position, isDone, listId"
        });

        // バージョン2へのアップグレード
        this.version(2).stores({
            // todoItemsのスキーマからpositionを削除し、prevIdとnextIdを追加
            todoItems: "++id, title, time, createdAt, updatedAt, isDone, listId, prevId, nextId"
        }).upgrade(async (tx) => {
            // データ移行処理
            const todoItemsTable = tx.table("todoItems");
            const allItems = await todoItemsTable.toArray();

            // listIdごとにアイテムをグループ化
            const itemsByList = allItems.reduce((acc, item) => {
                (acc[item.listId] = acc[item.listId] || []).push(item);
                return acc;
            }, {} as Record<number, any[]>);

            const newItems = [];
            for (const listId in itemsByList) {
                // 各リスト内でpositionを使ってソート
                const sorted = itemsByList[listId].sort((a, b) => a.position - b.position);

                for (let i = 0; i < sorted.length; i++) {
                    const currentItem = sorted[i];
                    const prevItem = sorted[i - 1];
                    const nextItem = sorted[i + 1];

                    // prevIdとnextIdを設定
                    currentItem.prevId = prevItem ? prevItem.id : null;
                    currentItem.nextId = nextItem ? nextItem.id : null;
                    delete currentItem.position; // 古いpositionプロパティを削除
                    newItems.push(currentItem);
                }
            }
            // 新しいスキーマで全件書き込み
            await todoItemsTable.clear();
            await todoItemsTable.bulkAdd(newItems);
        });

        // 最新バージョンをクラスのプロパティにマッピング
        this.todoLists = this.table("todoLists");
        this.todoItems = this.table("todoItems");
    }


    public async findAllTodoLists() {
        const todoListsData = await this.todoLists.toArray();
        const allItemsData = await this.todoItems.toArray();

        const todoLists = todoListsData.map(data => new TodoList(data));
        const allItemsMap = new Map<number, TodoItem>();

        // 全アイテムをインスタンス化してMapに格納
        allItemsData.forEach(data => {
            const item = new TodoItem(data);
            allItemsMap.set(item.id!, item);
        });

        // 全アイテムのprev/nextポインタを再接続
        allItemsMap.forEach(item => {
            if (item.prevId) {
                item.prev = allItemsMap.get(item.prevId) || null;
            }
            if (item.nextId) {
                item.next = allItemsMap.get(item.nextId) || null;
            }
        });

        // 各TodoListにアイテムを割り当て、head/tailを設定
        todoLists.forEach(todoList => {
            const itemsForList = [...allItemsMap.values()].filter(item => item.listId === todoList.id);
            if (itemsForList.length > 0) {
                todoList.head = itemsForList.find(item => item.prevId === null) || null;
                todoList.tail = itemsForList.find(item => item.nextId === null) || null;
                todoList.length = itemsForList.length;
            }
        });

        return todoLists;
    }

    public async findAllTodoItems() {
        const todoItemsData = await this.todoItems.toArray()
        
        return todoItemsData.map(data => new TodoItem(data))
    }

    public async findTodoListById(id: number) {
        const todoListData = await this.todoLists.get(id);
        if (!todoListData) return undefined;

        const todoList = new TodoList(todoListData);

        const itemsData = await this.findTodoItemsByListId(id);
        if (itemsData.length === 0) {
            return todoList; // 空のリスト
        }

        // --- 連結リストの再構築ロジック ---
        const itemMap = new Map<number, TodoItem>();
        // 1. インスタンス化してMapに格納
        const todoItems = itemsData.map(data => {
            const item = new TodoItem(data);
            itemMap.set(item.id!, item);
            return item;
        });

        // 2. prev/nextポインタを再接続
        todoItems.forEach(item => {
            if (item.prevId) {
                item.prev = itemMap.get(item.prevId) || null;
            }
            if (item.nextId) {
                item.next = itemMap.get(item.nextId) || null;
            }
        });

        // 3. headとtailを見つけて設定
        todoList.head = todoItems.find(item => item.prevId === null) || null;
        todoList.tail = todoItems.find(item => item.nextId === null) || null;
        todoList.length = todoItems.length;
        // --- ここまで ---

        return todoList;
    }

    public async findTodoItemById(id: number) {
        const data = await this.todoItems.get(id)
        
        if (!data) return undefined
        const todoItem = new TodoItem(data)
        return todoItem
    }

    public async findTodoItemsByListId(listId: number): Promise<any[]> {
        return await this.todoItems.where("listId").equals(listId).toArray();
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

    public async createTodoItem(title: string, listId: number): Promise<TodoItem | undefined> {
        // 現在のリストの末尾アイテム（nextIdがnull）を探す
        const itemsInList = await this.todoItems.where({ listId: listId }).toArray();
        const currentTail = itemsInList.find(item => item.nextId === null);

        const newItemData = {
            title,
            createdAt: new Date(),
            updatedAt: null,
            isDone: false,
            listId,
            prevId: currentTail ? currentTail.id : null, // 前のアイテムは現在の末尾
            nextId: null, // 新しいアイテムが末尾になる
        };

        // 新しいアイテムをDBに追加してIDを取得
        const newId = await this.todoItems.add(newItemData as any);

        // もし元の末尾アイテムが存在したら、そのnextIdを新しいアイテムのIDで更新する
        if (currentTail) {
            await this.todoItems.update(currentTail.id!, { nextId: newId });
        }

        return await this.findTodoItemById(newId);
    }

    public async saveTodoList(todoList: TodoList) {
        return await this.todoLists.put(todoList)
    }

    // bulkUpdateのkeyにはundefinedが許容されていないため、idがundefinedでないものだけを対象にする
    public async saveAllTodoItems(todoItems: TodoItem[]) {
        const plainObjects = todoItems.map(item => ({
            id: item.id,
            title: item.title,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            isDone: item.isDone,
            listId: item.listId,
            prevId: item.prev ? item.prev.id : null,
            nextId: item.next ? item.next.id : null,
        }));
        await this.todoItems.bulkPut(plainObjects as TodoItem[]);
        console.log("saveAllTodoItems", await this.findAllTodoItems());
    }

    public async saveTodoItem(todoItem: TodoItem) {
        return await this.todoItems.put(todoItem)
    }


}