const make = (element: HTMLElement) => {
    return () => {
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;

        let hook = element;

        if (element.shadowRoot?.getElementById("input")) {
            hook = element.shadowRoot.getElementById("input");
        }

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;

            const width = document.documentElement.clientWidth;
            const height = document.documentElement.clientHeight;

            if (left < 0 || left + element.offsetWidth > width - 1) return;
            if (top < 0 || top + element.offsetHeight > height - 1) return;

            element.style.left = left + "px";
            element.style.top = top + "px";
        };

        const onMouseUp = () => {
            isDragging = false;

            element.style.cursor = "default";
            document.body.style.userSelect = "";

            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        hook.addEventListener("mousedown", (e: MouseEvent) => {
            isDragging = true;

            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;

            element.style.cursor = "move";
            document.body.style.userSelect = "none";

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
    };
};

export default make;
