function Visualizer() {
    this.init = function () {
        var table = document.getElementById("opcodes");
        var cells = table.getElementsByTagName("td");
        this.index = [];
        for (var i = 0; i < cells.length; i++) {
            var text = cells[i].innerHTML;
            if (!text.match(/<b>[^<]*<\/b>/g) && text.length > 0) this.index[this.index.length] = cells[i];
        }
        this.last_hit = -1;
        this.last_hit_background = "";
    };

    this.hit = (opcode) => {
        if (this.last_hit != -1) this.index[this.last_hit].style.background = this.last_hit_background;
        this.last_hit = opcode;
        this.last_hit_background = this.index[this.last_hit].style.background;
        this.index[this.last_hit].style.background = "red";
    };

    this.init();
}

function main() {
    parent.window.visualizer = new Visualizer();
}
