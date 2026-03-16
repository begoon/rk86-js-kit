import page from "./index.html" with { type: "text" };

const server = Bun.serve({
    routes: {
        "/": new Response(page, { headers: { "Content-Type": "text/html" } }),
        "/.well-known/appspecific/com.chrome.devtools.json": new Response("OK"),
        "/console": async (req) => {
            const data = await req.json();
            if (data.type.startsWith("console")) {
                console.log([data.type, data.timestamp, ...[data.args.join(" ")]].join(" | "));
            } else {
                console.log(JSON.stringify(data, null, 2));
            }
            return new Response(undefined);
        },
        "/*": (req) => {
            const url = new URL(req.url);
            const path = url.pathname;
            return new Response(Bun.file(`.${path}`));
        },
    },

    port: 8000,
});

console.log(`server running at ${server.url}`);
