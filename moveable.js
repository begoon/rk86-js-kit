const make = (element) => {
    return () => {
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;

        element.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
        });

        element.addEventListener("mousemove", (e) => {
            if (!isDragging) return;

            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;

            const width = document.documentElement.clientWidth;
            const height = document.documentElement.clientHeight;

            if (left < 0 || left + element.offsetWidth > width - 1) return;
            if (top < 0 || top + element.offsetHeight > height - 1) return;
            element.style.left = left + "px";
            element.style.top = top + "px";
        });

        element.addEventListener("mouseup", () => (isDragging = false));
    };
};

export default make;
