export default class Visualizer {
    index: (HTMLElement | null)[] = [];
    last_hit = -1;

    init() {
        const cells = document.getElementById("visualizer_panel").querySelectorAll("i");
        this.index = [];
        for (let i = 0; i < cells.length; i++) {
            this.index[this.index.length] = cells[i].parentNode;
        }
        this.last_hit = -1;
    }

    hit(opcode: number): void {
        if (this.last_hit != -1) this.index[this.last_hit].classList.remove("active");
        this.last_hit = opcode;
        this.index[opcode].classList.add("active");
    }

    constructor() {
        this.init();
    }
}

function main() {
    const visualizer = new Visualizer();
    setInterval(() => {
        visualizer.hit(Math.floor(Math.random() * 256));
    }, 100);
}
