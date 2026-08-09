/* Generated network artifact. Edit this canonical template, then run `npm run network:sync`. */
(() => {
  const rack = document.querySelector(".rack[data-canonical-origin]");
  if (!rack) return;

  const live = rack.querySelector("[data-rack-live]");
  const announce = (message) => {
    if (!live) return;
    live.textContent = "";
    window.setTimeout(() => { live.textContent = message; }, 10);
  };

  rack.querySelectorAll("button[data-copy-value]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy-value") || "";
      try {
        await navigator.clipboard.writeText(value);
        const prior = button.textContent;
        button.textContent = "COPIED";
        announce(`${prior || "Value"} copied to clipboard.`);
        window.setTimeout(() => { button.textContent = prior; }, 1400);
      } catch {
        announce("Copy failed. Select the visible endpoint or example instead.");
      }
    });
  });

  const origin = rack.getAttribute("data-canonical-origin");
  const statusNode = rack.querySelector("[data-rack-status]");
  const proofNode = rack.querySelector("[data-rack-proof]");
  if (!origin || !statusNode || !proofNode) return;

  Promise.all([
    fetch(`${origin}/api/health/tools`, { credentials: "omit", mode: "cors" }),
    fetch(`${origin}/api/tools/proof`, { credentials: "omit", mode: "cors" }),
  ]).then(async ([healthResponse, proofResponse]) => {
    if (!healthResponse.ok || !proofResponse.ok) throw new Error("proof unavailable");
    const health = await healthResponse.json();
    const proof = await proofResponse.json();
    statusNode.textContent = health.ok && health.freeToolsEnabled ? "READY" : "STATUS UNKNOWN";
    proofNode.textContent = Number.isSafeInteger(proof.paidRuns) ? String(proof.paidRuns) : "STATUS UNKNOWN";
  }).catch(() => {
    statusNode.textContent = "STATUS UNKNOWN";
    proofNode.textContent = "STATUS UNKNOWN";
  });
})();
