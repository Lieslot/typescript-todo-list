

class Timer  {
    private elapsed : number = 0
    private startTime : number = 0
    private intervalid : number | undefined = undefined


    public start() {
        if (!this.intervalid) {
            this.startTime = Date.now() - this.elapsed
            this.intervalid = setInterval(() => this.update(), 100)
        }
    }
    public stop() {
        if (this.intervalid) {
            clearInterval(this.intervalid)
            this.elapsed = Date.now() - this.startTime
            this.intervalid = undefined
        }
    }
    public reset() {
        if (this.intervalid) {
            clearInterval(this.intervalid)
            this.intervalid = undefined
        }
        this.startTime = 0
        this.elapsed = 0
        this.intervalid = undefined
        const timerDisplay = document.getElementById("timer-display")
        if (!timerDisplay) {
            return
        }
        timerDisplay.innerText = "00:00:00"
    }

    private update() {
        this.elapsed = Date.now() - this.startTime
        const seconds = Math.floor(this.elapsed / 1000) % 60;
        const minutes = Math.floor(this.elapsed / 1000 / 60) % 3600;
        const hours = Math.floor(this.elapsed / 1000 / 3600)
        const display = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
        const timerDisplay = document.getElementById("timer-display")
        if (!timerDisplay) {
            return
        }
        timerDisplay.innerText = display
    }
}


const timer = new Timer()


document.getElementById("start")?.addEventListener("click", () => timer.start())
document.getElementById("stop")?.addEventListener("click", () => timer.stop())
document.getElementById("reset")?.addEventListener("click", () => timer.reset())