Bun.serve({
    async fetch(req: Request) {
        const url = new URL(req.url);
        const path = url.pathname === "/" ? "/index.html" : url.pathname;
        if (path === "/.well-known/appspecific/com.chrome.devtools.json") return new Response("OK");
        if (path === "/console") {
            const data = await req.json();
            if (data.type.startsWith("console")) {
                console.log([data.type, data.timestamp, ...[data.args.join(" ")]].join(" | "));
            } else {
                console.log(JSON.stringify(data, null, 2));
            }
            return new Response(undefined);
        }
        return new Response(Bun.file(`.${path}`));
    },
    port: 8000,
});
