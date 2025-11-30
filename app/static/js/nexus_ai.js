window.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("zbot-button");
    const box = document.getElementById("zbot-chatbox");
    const closeBtn = document.getElementById("zbot-close");
    const sendBtn = document.getElementById("zbot-send");
    const input = document.getElementById("zbot-text");
    const messages = document.getElementById("zbot-messages");

    if (!btn || !box || !closeBtn || !sendBtn || !input || !messages) return;

    function addMessage(text, cls) {
        const div = document.createElement("div");
        div.className = `zbot-msg ${cls}`;
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    let greeted = false;

    btn.onclick = () => {
        box.style.display = "flex";
        btn.classList.add("active");

        if (!greeted) {
            setTimeout(() => {
                addMessage(
                    "Hello! I’m Nexus, your AI assistant. I can explain the code you open, help analyze issues, and support you with JCL, REXX, and USS. How can I help?",
                    "zbot-bot"
                );
            }, 200);
            greeted = true;
        }
    };

    closeBtn.onclick = () => {
        box.style.display = "none";
        btn.classList.remove("active");
    };

async function sendToAI() {
    const msg = input.value.trim();
    if (!msg) return;

    addMessage(msg, "zbot-user");
    input.value = "";

    const code = document.getElementById("codeEditor").value || "";

    try {
        const res = await fetch("/api/zbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: msg,
                code: code
            })
        });

        const data = await res.json();
        addMessage(data.response, "zbot-bot");

    } catch (err) {
        addMessage("AI Error: " + err, "zbot-bot");
    }
}

    sendBtn.addEventListener("click", sendToAI);
    input.addEventListener("keypress", e => {
        if (e.key === "Enter") sendToAI();
    });
});