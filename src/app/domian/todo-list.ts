import { todoListRepository } from "../todo-list.ts"

// --- インターフェース定義 (変更なし) ---
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
    // position を削除
    prevId: number | null // 追加
    nextId: number | null // 追加
}

// --- TodoItem クラスの修正 ---
class TodoItem {
    title: string
    id?: number | undefined
    createdAt: Date
    updatedAt: Date | null
    isDone: boolean
    listId: number
    // position を削除
    prevId: number | null // 追加
    nextId: number | null // 追加

    // 連結リスト用のプロパティ
    next: TodoItem | null = null
    prev: TodoItem | null = null

    constructor({
        id,
        title,
        createdAt,
        updatedAt,
        isDone,
        listId,
        prevId, // 追加
        nextId, // 追加
    }: TodoItemParams) {
        this.title = title
        this.id = id
        this.createdAt = createdAt
        this.updatedAt = updatedAt
        this.isDone = isDone
        this.listId = listId
        this.prevId = prevId; // 追加
        this.nextId = nextId; // 追加
    }

    static create(params: TodoItemParams) : TodoItem {
        return new TodoItem(params)
    }

    public toggle() {
        this.isDone = !this.isDone
    }
}

// --- TodoList クラスの修正 ---
class TodoList {
    id?: number | undefined
    name: string
    position: number

    // 連結リストの先頭と末尾
    head: TodoItem | null = null
    tail: TodoItem | null = null
    length: number = 0

    constructor({
        id,
        name,
        position
    }: TodoListParams) {
        this.id = id
        this.name = name
        this.position = position
    }

    // イテレータを実装し、for...of で反復可能にする
    *[Symbol.iterator]() {
        let current = this.head;
        while (current) {
            yield current;
            current = current.next;
        }
    }

    // DB保存用に配列に変換するヘルパーメソッド
    toArray(): TodoItem[] {
        return [...this];
    }

    // 末尾にアイテムを追加
    push(todoItem: TodoItem) {
        todoItem.listId = this.id!;
        if (this.tail) { // リストに既にアイテムがある場合
            this.tail.next = todoItem;
            todoItem.prev = this.tail;
            this.tail = todoItem;
        } else { // リストが空の場合
            this.head = todoItem;
            this.tail = todoItem;
        }
        this.length++;
    }

    // 配列から複数のアイテムを追加（リポジトリからの読み込み時に使用）
    pushAll(todoItems: TodoItem[]) {
        // DBから取得した時点でposition順になっている想定
        for (const item of todoItems) {
            this.push(item);
        }
    }

    // 特定のアイテムの前に挿入
    insertBefore(newItem: TodoItem, target: TodoItem | null) {
        newItem.listId = this.id!;
        if (target === null) { // referenceItemがnullなら末尾に追加
            this.push(newItem);
            return;
        }

        newItem.prev = target.prev;
        newItem.next = target;

        if (target.prev) {
            target.prev.next = newItem;
        } else { // 先頭に挿入
            this.head = newItem;
        }
        target.prev = newItem;
        this.length++;
    }

    // アイテムをリストから削除
    remove(todoItem: TodoItem) {
        if (todoItem.listId !== this.id) {
            console.error("remove: todoItem.listId !== this.id");
            return;
        }


        if (todoItem.prev) {
            todoItem.prev.next = todoItem.next;
        } else { // 先頭アイテムを削除
            this.head = todoItem.next;
            if (this.head) {
                this.head.prev = null;
            }
        }

        if (todoItem.next) {
            todoItem.next.prev = todoItem.prev;
        } else { // 末尾アイテムを削除
            this.tail = todoItem.prev;
            if (this.tail) {
                this.tail.next = null;
            }
        }

        todoItem.next = null;
        todoItem.prev = null;
        this.length--;
    }
}

// movePosition は後のステップで修正します。
// 現在のコードは新しいデータ構造では動作しません。
const movePosition = async (draggedItemId: number, targetItemId: number | null, targetListId: number) => {
    const draggedItemData = await todoListRepository.findTodoItemById(draggedItemId);
    if (!draggedItemData) {
        console.error("Could not find dragged item data");
        return;
    }

    const sourceListId = draggedItemData.listId;

    // --- 同じリスト内での移動か、別リストへの移動かで処理を分岐 ---

    if (sourceListId === targetListId) {
        // --- 同じリスト内での移動 ---
        const todoList = await todoListRepository.findTodoListById(targetListId);
        if (!todoList) return;

        // 1. 移動するアイテムをリストから見つけて削除
        const itemToMove = [...todoList].find(item => item.id === draggedItemId);
        if (!itemToMove) return;
        todoList.remove(itemToMove);

        // 2. ターゲットの位置に同じインスタンスを再挿入
        if (targetItemId === null) { // 末尾
            todoList.push(itemToMove);
        } else {
            const referenceItem = [...todoList].find(item => item.id === targetItemId);
            todoList.insertBefore(itemToMove, referenceItem || null);
        }

        // 3. 変更を保存
        await todoListRepository.saveAllTodoItems(todoList.toArray());

    } else {
        // --- 別リストへの移動 ---
        const sourceTodoList = await todoListRepository.findTodoListById(sourceListId);
        const targetTodoList = await todoListRepository.findTodoListById(targetListId);
        if (!sourceTodoList || !targetTodoList) return;

        const itemToRemove = [...sourceTodoList].find(item => item.id === draggedItemId);
        if (itemToRemove) {
            sourceTodoList.remove(itemToRemove);
        }

        const newItem = new TodoItem(draggedItemData);
        if (targetItemId === null) {
            targetTodoList.push(newItem);
        } else {
            const referenceItem = [...targetTodoList].find(item => item.id === targetItemId);
            targetTodoList.insertBefore(newItem, referenceItem || null);
        }

        // 両方のリストの変更を保存
        await todoListRepository.saveAllTodoItems(sourceTodoList.toArray());
        await todoListRepository.saveAllTodoItems(targetTodoList.toArray());
    }
}

export { TodoList, TodoItem, movePosition }