class DOMHelper {


    static querySelector<T extends HTMLElement>(
        selector: string, 
        parent : Document | HTMLElement = document
    ) : T | null {
        if (!parent) {
            return null
        }
        return parent.querySelector(selector) as T
    }

    static querySelectorAll<T extends HTMLElement>(
        selector: string,
        parent : Document | HTMLElement = document
    ) : T[] {
        if (!parent) {
            return []
        }
        return Array.from(parent.querySelectorAll(selector)) as T[]
    }


    static closest<T extends HTMLElement>(
        target : HTMLElement,
        selector: string, 
    ) : T | null {
        if (!target) {
            return null
        }
        return target.closest(selector) as T
    }

}

export { DOMHelper }